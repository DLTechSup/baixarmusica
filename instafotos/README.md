# InstaFotos

**Desenvolvido por DLTechSup**

Programa de desktop (separado do Sonora) para **ver e baixar as fotos de um perfil ou post do Instagram**.
Cole o link e as fotos aparecem dentro do programa, em formato de galeria, com a opção de baixar.

## Recursos

- Cole o link de um **perfil** (`instagram.com/usuario`), de um **post/reel** ou só o `@usuario`
- As fotos aparecem como uma **página de galeria**, carregando conforme chegam (dá para parar a qualquer momento)
- **Selecionar tudo**, selecionar fotos específicas ou baixar uma foto pelo botão ⬇ do card
- Posts com várias fotos (carrossel) são baixados completos; vídeos dos posts são opcionais
- Fila de downloads com poucos arquivos em paralelo (para não irritar o Instagram)
- Pasta de destino à sua escolha (padrão: `Imagens/InstaFotos/<usuario>/`)
- Tudo embutido no instalador: **não precisa instalar Python** nem nada mais

## Sobre o login

O Instagram limita muito o acesso sem conta. Posts públicos soltos às vezes abrem sem login, mas **perfis inteiros
quase sempre exigem login**. Por isso o programa tem o botão **Login**, onde você cola o cookie `sessionid` da sua
conta (o passo a passo aparece na janela). Sua senha nunca passa pelo programa.

- O cookie fica salvo só no seu computador, criptografado quando o sistema permite
- Perfis **privados** só aparecem se a conta usada no login seguir o perfil
- Use uma **conta secundária**: baixar muita coisa pode fazer o Instagram limitar ou bloquear a conta
- O Instagram muda o site com frequência; se parar de funcionar, atualize o motor (`pip install -U instaloader`)
  e gere o instalador de novo

## Gerar o executável no Windows

Dê **dois cliques em `gerar-instalador.bat`**. Ele verifica o Node.js 20+ e o Python 3.9+ (oferece instalar pelo
`winget`), instala as dependências, compila o motor e cria na pasta `release`:

| Arquivo | O que é |
|---|---|
| `InstaFotos-Setup-1.0.0.exe` | instalador com atalhos |
| `InstaFotos-Portatil-1.0.0.exe` | versão portátil, não precisa instalar |

O GitHub Actions (**Actions → Gerar InstaFotos (Windows)**) também gera esses arquivos a cada alteração desta pasta.

## Gerar manualmente / outros sistemas

```bash
cd instafotos
npm install
npm run dist        # compila o motor e gera o instalador em release/
```

Etapas separadas: `npm run engine` (compila `engine/igfetch.py` com PyInstaller para `resources/bin`) e
`npx electron-builder --win` (ou `--mac` / `--linux`).

## Desenvolvimento

```bash
cd instafotos
pip install -r requirements.txt   # Instaloader
npm install
npm start                         # sem resources/bin/igfetch, usa engine/igfetch.py com o Python do sistema
```

## Estrutura

```
engine/igfetch.py    motor (Instaloader): lista e baixa, responde em JSON
electron/            processo principal (janela, login, execução do motor)
ui/                  interface (galeria)
scripts/             build do motor
gerar-instalador.bat gera o instalador no Windows
```

## Aviso

Baixe apenas conteúdo seu ou que você tenha permissão para baixar. Os termos de uso do Instagram e as leis de
direitos autorais se aplicam. O programa não tem relação com o Instagram/Meta.
