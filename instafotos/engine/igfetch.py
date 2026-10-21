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
from urllib.parse import urlparse

import instaloader
from instaloader import exceptions as ex

POST_RE = re.compile(r'^/(?:[^/]+/)?(?:p|reels?|tv)/([A-Za-z0-9_-]+)')
USER_RE = re.compile(r'^[A-Za-z0-9._]{1,30}$')
RESERVED = {'explore', 'accounts', 'direct', 'stories', 'reels', 'reel', 'p', 'tv', 'about', 'developer'}


def emit(**event):
    sys.stdout.write(json.dumps(event, ensure_ascii=False) + '\n')
    sys.stdout.flush()


def fail(code, message):
    emit(type='error', code=code, message=message)
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


def explain(err):
    if isinstance(err, ex.ProfileNotExistsException):
        return 'not_found', 'Perfil ou post não encontrado.'
    if isinstance(err, ex.PrivateProfileNotFollowedException):
        return 'private', 'Este perfil é privado. Só dá para ver se a conta usada no login seguir o perfil.'
    if isinstance(err, (ex.LoginRequiredException, ex.QueryReturnedForbiddenException)):
        return 'login', 'O Instagram exige login para ver isto. Informe o cookie da sua conta em "Login".'
    if isinstance(err, ex.TooManyRequestsException):
        return 'rate', 'O Instagram limitou as requisições. Aguarde alguns minutos e tente de novo.'
    if isinstance(err, ex.QueryReturnedNotFoundException):
        return 'not_found', 'Perfil ou post não encontrado.'
    if isinstance(err, ex.ConnectionException):
        msg = str(err)
        if re.search(r'401|403|429|login|Please wait', msg, re.I):
            return 'login', 'O Instagram bloqueou o acesso sem login. Informe o cookie da sua conta em "Login" ou tente mais tarde.'
        return 'network', 'Não foi possível falar com o Instagram. Verifique sua internet.'
    return 'error', str(err) or err.__class__.__name__


def post_item(post):
    typename = post.typename
    count = post.mediacount if typename == 'GraphSidecar' else 1
    caption = (post.caption or '').strip().replace('\n', ' ')
    return {
        'type': 'post',
        'shortcode': post.shortcode,
        'thumb': post.url,
        'kind': typename,
        'isVideo': bool(post.is_video),
        'count': count,
        'caption': caption[:140],
        'date': post.date_utc.strftime('%Y-%m-%d'),
        'owner': post.owner_username,
    }


def cmd_list(args):
    kind, name = parse_target(args.target)
    loader = make_loader(args.sessionid)
    try:
        if kind == 'post':
            post = instaloader.Post.from_shortcode(loader.context, name)
            emit(type='profile', username=post.owner_username, fullName='', biography='', posts=1,
                 followers=None, isPrivate=False, picture=None, single=True)
            emit(**post_item(post))
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
        for post in profile.get_posts():
            emit(**post_item(post))
            count += 1
            if args.limit and count >= args.limit:
                break
        emit(type='done', count=count)
    except SystemExit:
        raise
    except Exception as err:  # noqa: BLE001 - traduzimos para uma mensagem amigável
        fail(*explain(err))


def cmd_download(args):
    loader = make_loader(args.sessionid)
    try:
        post = instaloader.Post.from_shortcode(loader.context, args.shortcode)
        folder = os.path.join(args.out, post.owner_username)
        os.makedirs(folder, exist_ok=True)
        stamp = post.date_utc.strftime('%Y-%m-%d')
        base = f'{post.owner_username}_{stamp}_{post.shortcode}'
        items = []
        if post.typename == 'GraphSidecar':
            for node in post.get_sidecar_nodes():
                items.append((node.is_video, node.video_url if node.is_video else node.display_url))
        else:
            items.append((post.is_video, post.video_url if post.is_video else post.url))
        total = len(items)
        saved = 0
        for i, (is_video, url) in enumerate(items, 1):
            if is_video and not args.videos:
                continue
            stem = os.path.join(folder, base if total == 1 else f'{base}_{i}')
            loader.download_pic(stem, url, post.date_utc)
            for ext in ('jpg', 'jpeg', 'png', 'webp', 'mp4'):
                if os.path.exists(f'{stem}.{ext}'):
                    emit(type='file', path=os.path.abspath(f'{stem}.{ext}'))
                    saved += 1
                    break
        emit(type='done', count=saved, folder=os.path.abspath(folder))
    except SystemExit:
        raise
    except Exception as err:  # noqa: BLE001
        fail(*explain(err))


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
