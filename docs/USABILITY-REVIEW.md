# Revisão de criação e direção — 12/10/2026

Avaliação independente por subagente, inspeção de código e sessões descartáveis no site. Simulação de fluxo profissional; ainda requer validação com autores reais. Nenhuma obra do usuário foi alterada durante os testes.

| Achado reproduzido | Correção desta rodada |
| --- | --- |
| Onomatopeia desaparecia da barra ao selecionar quadro | Comandos de Balão, Texto e Onomatopeia permanecem na barra, com vínculo automático |
| Duplicar/remover sob Geometria pareciam comandos geométricos | Retirados da direita; ações agrupadas no submenu da camada; Delete e desfazer mantidos |
| Falas eram simultâneas e repetir um arquivo eliminava uma ocorrência | Fila por balão, sequencial, preservando eventos que usam o mesmo arquivo |
| Não havia ordem, volume ou intervalo por fala | Seção Falas e efeitos deste momento, com nomes, trechos de texto, setas, ganho e pausa |
| Não havia timing para impacto de transição | Efeitos na entrada, ao concluir a transição ou após as falas, com atraso configurável |
| Lettering temporário não tinha fluxo | Mais opções na timeline → Transição com onomatopeia; opção de exibição temporária e alternativa estática no movimento reduzido |
| Novos balões ficavam encobertos e com nomes iguais | Nomes numerados e colocação em espaços livres dentro do quadro, também para modelos |
| Novo momento mantinha o balão anterior selecionado | Seleção limpa ao criar momento; prévia inicia no momento em edição |
| Apagar um momento podia remover conteúdo da leitura | Confirmação e transferência dos elementos para momento vizinho, com desfazer |
| Arrastar a arte por engano durante lettering | Bloquear arraste no submenu da camada |
| Esperar a abertura visual podia pular a primeira fala | Início por interação, alinhando animação e áudio; fila cancelada ao avançar/voltar |

## Onde organizar

Importe pela biblioteca da esquerda. Associe fala ao balão, efeito à onomatopeia e música ao quadro usando os seletores da direita. Em Áudio, Ordem, volume e disparo abre a sequência do momento. Falas terminam antes da próxima começar; a pausa é medida após o fim da fala anterior. Volumes do autor multiplicam os controles de volume do leitor. Efeitos podem tocar junto à voz ou após ela, conforme o disparo selecionado.

Testar este momento abre a prévia na posição em edição. Inicie a leitura para ouvir; a primeira ação começa o momento, uma ação durante a transição conclui a apresentação, e a seguinte avança. Voltar cancela falas/efeitos pendentes e não os repete. Ouvir novamente repete a sequência pontual; não reinicia música.

## Roteiro de aceitação

1. Importar o SVG fornecido ou compor dois quadros; inserir arte e bloquear seu arraste.
2. Criar três balões: conferir nomes distintos e ausência de sobreposição exata.
3. Associar dois arquivos de voz e reutilizar o primeiro no terceiro balão.
4. Ordenar 3 → 1 → 2, reduzir ganho de uma fala e adicionar uma pausa.
5. Testar o momento e conferir a sequência e o volume. Avançar antes do término e verificar cancelamento; voltar sem som; repetir explicitamente.
6. Criar transição com lettering temporário e efeito; testar entrada/fim da transição/após diálogo. Concluir a transição cedo e verificar disparo sem reiniciar a fala.
7. Vincular quadros e conferir música compartilhada. Reabrir o rascunho e conferir persistência da direção.
8. Remover um momento: cancelar, confirmar e desfazer; verificar que os elementos continuam na leitura.
9. Publicar uma obra descartável e conferir leitor móvel e áudio; modificar o rascunho sem alterar a publicação.

## Limites da rodada

Falas usam o fim do arquivo como limite da fila: não há corte, fade, waveform nem edição da gravação no estúdio. Áudio e animação são importados prontos. Efeitos podem se sobrepor de forma intencional; não há uma estação de mixagem multipista. O bloqueio protege o arraste, sem impedir edição por propriedades. O posicionamento inicial evita sobreposição enquanto há espaço no quadro; composições cheias exigem ajuste manual. Compatibilidade com Safari/iOS e validação artística com autores reais seguem no plano de revisão; os testes de navegador são Chromium, incluindo viewport móvel.
