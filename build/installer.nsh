; Personalização do instalador do Sonora (DLTechSup)

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao Sonora"
  !define MUI_WELCOMEPAGE_TEXT "Este assistente vai instalar o Sonora ${VERSION} no seu computador.$\r$\n$\r$\nCom o Sonora você baixa músicas do YouTube em MP3 de alta qualidade, com capa e informações do artista, em poucos cliques.$\r$\n$\r$\nDesenvolvido por DLTechSup.$\r$\n$\r$\nClique em Avançar para continuar."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Desinstalar o Sonora"
  !define MUI_WELCOMEPAGE_TEXT "Este assistente vai remover o Sonora do seu computador.$\r$\n$\r$\nSuas músicas baixadas não serão apagadas.$\r$\n$\r$\nObrigado por usar um programa DLTechSup."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

!macro customHeader
  BrandingText "Sonora · DLTechSup"
!macroend
