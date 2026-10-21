#!/usr/bin/env python3
"""Motor do InstaFotos: lista e baixa as fotos de um perfil ou post do Instagram.

Usa a biblioteca Instaloader (MIT). Toda a saída é em JSON, uma linha por evento,
para o aplicativo Electron ler.

  igfetch.py version
  igfetch.py list     --target ALVO [--sessionid COOKIE] [--limit N]
  igfetch.py download --shortcode COD --out PASTA [--sessionid COOKIE] [--videos]
"""
import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import instaloader
from instaloader import exceptions as ex

POST_RE = re.compile(r'^/(?:[^/]+/)?(?:p|reels?|tv)/([A-Za-z0-9_-]+)')
USER_RE = re.compile(r'^[A-Za-z0-9._]{1,30}$')
RESERVED = {'explore', 'accounts', 'direct', 'stories', 'reels', 'reel', 'p', 'tv', 'about', 'developer'}


def emit(**event):
    sys.stdout.write(json.dumps(event, ensure_ascii=False) + '\n')
    sys.stdout.flush()


def fail(code, message, detail=''):
    emit(type='error', code=code, message=message, detail=detail)
    sys.exit(1)


def parse_target(text):
    """Retorna ('post', shortcode) ou ('profile', usuario)."""
    text = (text or '').strip()
    if not text:
        fail('invalid', 'Cole um link ou @usuário do Instagram.')
    if text.startswith('@'):
        text = text[1:]
    if USER_RE.match(text) and not re.match(r'(?i)(www\.|m\.)?(instagram\.com|instagr\.am)$', text):
        return 'profile', text
    if '://' not in text:
        text = 'https://' + text
    url = urlparse(text)
    host = (url.hostname or '').lower()
    if host not in ('instagram.com', 'www.instagram.com', 'instagr.am', 'm.instagram.com'):
        fail('invalid', 'Este não parece um link do Instagram.')
    path = url.path or '/'
    m = POST_RE.match(path)
    if m:
        return 'post', m.group(1)
    first = path.strip('/').split('/')[0]
    if first and first.lower() not in RESERVED and USER_RE.match(first):
        return 'profile', first
    fail('invalid', 'Link do Instagram não reconhecido. Use o link de um perfil ou de um post.')


def parse_cookie(value):
    """Aceita só o sessionid ou o texto inteiro do cookie (sessionid=...; csrftoken=...)."""
    value = (value or '').strip().strip('"')
    if not value:
        return {}
    if '=' not in value:
        return {'sessionid': value}
    jar = {}
    for part in value.split(';'):
        if '=' in part:
            k, v = part.strip().split('=', 1)
            jar[k.strip()] = v.strip()
    return {k: v for k, v in jar.items() if k in ('sessionid', 'csrftoken', 'ds_user_id')}


def make_loader(sessionid):
    loader = instaloader.Instaloader(
        quiet=True,
        download_video_thumbnails=False,
        download_comments=False,
        save_metadata=False,
        post_metadata_txt_pattern='',
        max_connection_attempts=1,
        request_timeout=30,
    )
    cookies = parse_cookie(sessionid)
    if cookies.get('sessionid'):
        session = loader.context._session
        for k, v in cookies.items():
            session.cookies.set(k, v, domain='.instagram.com')
        if cookies.get('csrftoken'):
            session.headers.update({'X-CSRFToken': cookies['csrftoken']})
        username = loader.test_login()
        if not username:
            fail('bad_session', 'A sessão (cookie) do Instagram é inválida ou expirou. Entre de novo no Instagram e copie o cookie novamente.')
        loader.context.username = username
    return loader


def explain(err, logged_in=False):
    """Traduz a exceção para (código, mensagem, detalhe técnico)."""
    detail = ' '.join(str(err).split())[:300] or err.__class__.__name__
    if isinstance(err, ex.ProfileNotExistsException):
        return 'not_found', 'Perfil ou post não encontrado.', detail
    if isinstance(err, ex.PrivateProfileNotFollowedException):
        return 'private', 'Este perfil é privado. Só dá para ver se a conta usada no login seguir o perfil.', detail
    if isinstance(err, ex.TooManyRequestsException):
        return 'rate', 'O Instagram limitou as requisições. Aguarde alguns minutos e tente de novo.', detail
    if isinstance(err, ex.QueryReturnedNotFoundException):
        return 'not_found', 'Perfil ou post não encontrado.', detail
    if isinstance(err, ex.LoginRequiredException) or isinstance(err, ex.QueryReturnedForbiddenException):
        return 'login', 'O Instagram exige login para ver isto. Clique em "Login" e informe o cookie da sua conta.', detail
    if isinstance(err, (ex.ConnectionException, ex.BadResponseException)):
        if re.search(r'resolve|timed out|timeout|Max retries|Connection (?:aborted|refused|reset)|getaddrinfo|SSL', detail, re.I):
            return 'network', 'Não foi possível falar com o Instagram. Verifique sua internet.', detail
        if not logged_in:
            return 'login', 'O Instagram não libera a lista de fotos sem login. Clique em "Login" e informe o cookie da sua conta.', detail
        if re.search(r'401|403|429|login|Please wait|checkpoint|challenge', detail, re.I):
            return 'rate', 'O Instagram recusou o pedido (limite de requisições ou sessão expirada). Aguarde um pouco ou refaça o login com um cookie novo.', detail
        return 'error', 'O Instagram recusou o pedido.', detail
    return 'error', detail, detail


# --- API web do Instagram (v1) ------------------------------------------------------------
# A listagem por GraphQL do Instaloader foi bloqueada pelo Instagram (devolve HTML em vez de JSON),
# então a lista de fotos usa os mesmos endpoints que o site usa quando você está logado.

def best_image(node):
    cands = ((node.get('image_versions2') or {}).get('candidates')) or []
    if not cands:
        return None
    return max(cands, key=lambda c: c.get('width') or 0).get('url')


def best_video(node):
    vids = node.get('video_versions') or []
    if not vids:
        return None
    return max(vids, key=lambda c: c.get('width') or 0).get('url')


def api_item(item):
    """Converte um item da API v1 no formato usado pelo app."""
    kids = item.get('carousel_media') or []
    first = kids[0] if kids else item
    caption = ((item.get('caption') or {}).get('text') or '').strip().replace('\n', ' ')
    taken = item.get('taken_at') or 0
    return {
        'type': 'post',
        'shortcode': item.get('code'),
        'thumb': best_image(first) or best_image(item),
        'kind': 'GraphSidecar' if kids else ('GraphVideo' if item.get('media_type') == 2 else 'GraphImage'),
        'isVideo': item.get('media_type') == 2,
        'count': len(kids) if kids else 1,
        'caption': caption[:140],
        'date': datetime.fromtimestamp(taken, timezone.utc).strftime('%Y-%m-%d') if taken else '',
        'owner': (item.get('user') or {}).get('username', ''),
    }


def api_nodes(item):
    """Lista (é_vídeo, url) de cada foto/vídeo de um post."""
    nodes = item.get('carousel_media') or [item]
    out = []
    for n in nodes:
        is_video = n.get('media_type') == 2
        url = best_video(n) if is_video else best_image(n)
        if url:
            out.append((is_video, url))
    return out


def shortcode_to_id(code):
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    n = 0
    for ch in code[:11] if len(code) > 28 else code:
        n = n * 64 + alphabet.index(ch)
    return n


def fetch_media(loader, shortcode):
    data = loader.context.get_json(f'api/v1/media/{shortcode_to_id(shortcode)}/info/', {})
    items = data.get('items') or []
    if not items:
        raise ex.QueryReturnedNotFoundException('Post não encontrado.')
    return items[0]


def iter_feed(loader, userid, limit=0):
    count, max_id = 0, None
    while True:
        params = {'count': 12}
        if max_id:
            params['max_id'] = max_id
        data = loader.context.get_json(f'api/v1/feed/user/{userid}/', params)
        for item in data.get('items') or []:
            yield item
            count += 1
            if limit and count >= limit:
                return
        max_id = data.get('next_max_id')
        if not data.get('more_available') or not max_id:
            return
        time.sleep(1.2)


def cmd_list(args):
    kind, name = parse_target(args.target)
    loader = make_loader(args.sessionid)
    try:
        if kind == 'post':
            item = fetch_media(loader, name)
            post = api_item(item)
            emit(type='profile', username=post['owner'], fullName='', biography='', posts=1,
                 followers=None, isPrivate=False, picture=None, single=True)
            emit(**post)
            emit(type='done', count=1)
            return
        profile = instaloader.Profile.from_username(loader.context, name)
        emit(type='profile', username=profile.username, fullName=profile.full_name,
             biography=(profile.biography or '')[:200], posts=profile.mediacount,
             followers=profile.followers, isPrivate=profile.is_private, picture=profile.profile_pic_url,
             single=False)
        if profile.is_private and not profile.followed_by_viewer:
            fail('private', 'Este perfil é privado. Só dá para ver se a conta usada no login seguir o perfil.')
        count = 0
        for item in iter_feed(loader, profile.userid, args.limit):
            post = api_item(item)
            if post['shortcode'] and post['thumb']:
                emit(**post)
                count += 1
        emit(type='done', count=count)
    except SystemExit:
        raise
    except Exception as err:  # noqa: BLE001 - traduzimos para uma mensagem amigável
        fail(*explain(err, bool(parse_cookie(args.sessionid).get('sessionid'))))


def cmd_download(args):
    loader = make_loader(args.sessionid)
    try:
        item = fetch_media(loader, args.shortcode)
        owner = (item.get('user') or {}).get('username') or 'instagram'
        folder = os.path.join(args.out, owner)
        os.makedirs(folder, exist_ok=True)
        taken = datetime.fromtimestamp(item.get('taken_at') or 0, timezone.utc)
        base = f"{owner}_{taken.strftime('%Y-%m-%d')}_{args.shortcode}"
        items = api_nodes(item)
        saved = 0
        for i, (is_video, url) in enumerate(items, 1):
            if is_video and not args.videos:
                continue
            stem = os.path.join(folder, base if len(items) == 1 else f'{base}_{i}')
            loader.download_pic(stem, url, taken)
            for ext in ('jpg', 'jpeg', 'png', 'webp', 'mp4'):
                if os.path.exists(f'{stem}.{ext}'):
                    emit(type='file', path=os.path.abspath(f'{stem}.{ext}'))
                    saved += 1
                    break
        emit(type='done', count=saved, folder=os.path.abspath(folder))
    except SystemExit:
        raise
    except Exception as err:  # noqa: BLE001
        fail(*explain(err, bool(parse_cookie(args.sessionid).get('sessionid'))))


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('version')
    p = sub.add_parser('list')
    p.add_argument('--target', required=True)
    p.add_argument('--sessionid', default='')
    p.add_argument('--limit', type=int, default=0)
    d = sub.add_parser('download')
    d.add_argument('--shortcode', required=True)
    d.add_argument('--out', required=True)
    d.add_argument('--sessionid', default='')
    d.add_argument('--videos', action='store_true')
    args = ap.parse_args()
    if args.cmd == 'version':
        emit(type='version', version=instaloader.__version__)
    elif args.cmd == 'list':
        cmd_list(args)
    else:
        cmd_download(args)


if __name__ == '__main__':
    main()
