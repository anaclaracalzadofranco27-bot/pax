# Overhead Bin Alpha — fontes modulares

A entrega e a reprodução continuam sendo feitas **exclusivamente pelo arquivo `FINALPROJECT_APHA.html` da raiz**. Ele permanece independente (HTML, CSS, JS, SVG e imagens incorporados) e não depende da pasta `src/` ao ser aberto.

## Como editar

Edite os arquivos em `src/`, **não** edite o HTML final manualmente. Para reconstruir:

```bash
python tools/build.py
python tools/build.py --check
```

É necessário Python 3.9+ (somente biblioteca padrão). O `--check` compara o resultado **byte a byte** com o HTML versionado e falha se algum módulo não tiver sido compilado. O GitHub Actions repete essa verificação em commits e pull requests.

## Onde encontrar cada parte

| Fonte | Responsabilidade |
| --- | --- |
| `src/page.template.html` | Estrutura externa e pontos de inclusão dos módulos |
| `src/css/global.css` | CSS global e estilos de transições / gravação |
| `src/html/*.html` | Estrutura de cada aba: avião, CAD 3D, bins, vista superior, integrada, encerramento e tour |
| `src/js/core/config.js` | Paleta, geometria e configurações comuns |
| `src/js/engine/cad2d-and-shared.js` | Desenho técnico CAD 2D e funções compartilhadas |
| `src/js/engine/manikin.js` | Renderização biomecânica e manequim |
| `src/js/engine/seated-ergonomics.js` | Ergonomia sentada |
| `src/js/engine/unified-simulation.js` | Simulação integrada (aba 5) |
| `src/js/engine/cad3d.js` | Bin Alpha 3D, quatro malas, câmera e transição para a vista superior |
| `src/js/pax/bridge.js` | Comunicação da Aba 1 com o iframe |
| `src/pax/index.template.html`, `src/pax/styles.css`, `src/pax/js/*.js` | Cena interna do avião, materiais e movimentos dos passageiros |
| `src/js/topview/animation.js` e `src/assets/topview/*.base64` | Vista superior da cabine e desenhos vetoriais incorporados |
| `src/js/bins/export.js` e `src/js/topview/export.js` | Exportadores pontuais |
| `src/js/closing/animation.js` e `src/svg/closing/*.svg` | Encerramento e desenhos SVG embutidos |
| `src/js/tour/director-and-recording.js` | Ordem das cenas, morphs, cinco takes e gravação 1920 × 1080 |
| `src/js/unified/door-addon.js` | Movimento adicional da porta na simulação integrada |
| `src/svg/pax/*.svg` | Desenhos da aeronave no iframe |

## Regras importantes

- **A modularização é de código-fonte, não de carregamento em tempo de execução.** O build reintegra tudo na mesma posição e dentro dos mesmos elementos `<script>`/`<style>`. Os escopos e os objetos globais `window.*` permanecem inalterados.
- O iframe da Aba 1 é inserido como `srcdoc` no HTML final. O build escapa `<script>`, `</script>` e `<!--` somente nessa inclusão; **não altere essa regra**, pois protege o `<script type="text/plain" id="pax-src">` externo.
- Os arquivos `.svg.base64` são o conteúdo exato de imagens SVG já embutidas em JavaScript; permanecem codificados por compatibilidade visual.
- **Nenhuma limpeza de CSS, troca de Three.js, alteração na geometria ou no timing foi feita nesta separação.** Os cinco takes, as oito abas, os cálculos e as transições permanecem como estavam na versão de referência.
- Depois de alterações futuras, valide as oito abas, a Simulação Completa e especialmente o Take 02 (giro CAD → bin Alpha), o Take 03 (seção → manequim) e a exportação Full HD.

O ponto de verdade é o código modular em `src/`. O HTML final é um artefato gerado e deve ser atualizado no mesmo commit de qualquer alteração de fonte.

## Limpeza conservadora de código não utilizado (18/11/2026)

Foram removidas funções sem referência literal, constantes não lidas, seletores SVG `.filNN` sem correspondência fora do CSS e os estilos dos antigos cartões biomecânicos (o overlay não existe mais no HTML). A expressão que desenha os percentis mantém a execução; apenas o array `stats`, que nunca era lido, deixou de ser criado. Funções IIFE e regras potencialmente dinâmicas foram preservadas.

**Intocados nesta limpeza:** as sete estruturas de `src/html/`, `src/js/engine/cad3d.js` (malas, câmera e cotas), `src/js/tour/director-and-recording.js` (cinco takes, suas transições e gravação Full HD) e os demais estilos em uso.

Verificação estática:

```bash
python tools/build.py --check
python tools/verify_preservation.py
```

Esses testes não substituem a reprodução visual das oito abas nem a gravação dos takes em navegador.
