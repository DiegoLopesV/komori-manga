# Plano de revisão — Komori v0.1

Faça a revisão no computador para editar e no celular para ler. Use primeiro “Explorar demonstração”, depois sua própria arte. Cadastros por e-mail estão limitados pelo serviço do piloto; a configuração de SMTP foi adiada por decisão do proprietário.

## 1. Composição e liberdade artística

- Escolher modelos clássico, diagonal e página inteira; editar os quadros resultantes.
- Importar uma página pronta e conferir os recortes em cada quadro. Mover os vértices, ajustar curvatura, redimensionar e reposicionar.
- Importar quadros separados; verificar proporção, recorte, escala e posição da imagem.
- Criar balões, textos e onomatopeias; testar tamanhos, cores, duplicação, ordem das camadas e desfazer/refazer.
- Selecionar um quadro e pressionar Delete/Backspace; conferir remoção e desfazer. Digitar em um balão não deve acionar remoção do elemento.
- Conferir se a interface atrapalha a arte em páginas densas. Anotar principalmente tarefas difíceis e controles pouco claros.

## 2. Direção e experiência de leitura

- Organizar cinco momentos: quadro → balão → onomatopeia/SFX → animação → conclusão.
- Revelar e ocultar elementos; conferir a página ao final e ao retornar a cada momento.
- Avançar durante transição: primeiro clique conclui a apresentação, seguinte avança. Testar setas e clique direito na página.
- Associar falas, SFX e música. Avançar interrompe falas/SFX; voltar não os repete. “Ouvir novamente” repete apenas os sons pontuais.
- Música deve continuar entre momentos/páginas sem reiniciar ao voltar. Loop de animação não bloqueia navegação.
- No celular, conferir legibilidade com zoom e navegação por botões. Testar áudio silenciado e movimento reduzido com alternativa estática.

## 3. Conta e publicação

- Entrar com conta autorizada; criar obra, título, capa, descrição, idioma e links HTTPS de apoio.
- Publicar só o capítulo atual. Abrir o link em uma janela anônima, sem conta.
- Editar o rascunho e conferir que o link continua com a versão anterior. Atualizar o capítulo e conferir a mudança.
- Publicar um segundo capítulo; confirmar que o primeiro não recebe alterações pendentes do rascunho.
- Marcar conteúdo adulto e confirmar que o aviso aparece antes da capa e da leitura.
- Recarregar editor e biblioteca; conferir persistência. Abrir com outra conta para conferir isolamento.
- Em uma obra descartável, cancelar a confirmação da lixeira e conferir que ela permanece. Confirmar a exclusão e conferir que rascunho, publicação e arquivos desaparecem, inclusive após recarregar.

## 4. Revisão técnica antes de ampliar o piloto

- Executar testes e build; verificar o check do GitHub no commit revisado.
- Revisar SQL/RLS com atenção a ownership, snapshots e mídia privada. Reexecutar advisors no projeto.
- Configurar SMTP e testar confirmação/recuperação reais antes de abrir cadastro amplo.
- Definir cotas no servidor, retenção de arquivos, backup, restauração e exportação/exclusão de obras.
- Revisar acessibilidade, navegação por teclado, Safari/iOS e codecs em dispositivos reais. Testes automatizados iniciais cobrem Chromium.
- Definir política de conteúdo, denúncias e condições operacionais do serviço. Rever hospedagem antes de monetizar ou operar comercialmente.

## Registro do feedback

Para cada problema, registre: dispositivo/navegador, tarefa, resultado esperado, resultado observado e passos para reproduzir. Classifique em bloqueador (perda de dados, publicação incorreta, acesso indevido), funcional (recurso não funciona) ou experiência (funciona, mas é difícil de usar).

Uma obra curta real será o critério artístico principal para a próxima iteração. Não adicionar novas funções antes de corrigir os bloqueadores encontrados nessa revisão.
