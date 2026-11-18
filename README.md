# Overhead Bin Alpha — fontes modulares

A entrega e a reprodução continuam sendo feitas **exclusivamente pelo arquivo `FINALPROJECT_APHA.html` da raiz**. Ele permanece independente (HTML, CSS, JS, SVG e imagens incorporados) e não depende da pasta `src/` ao ser aberto.

## Como editar

Edite os arquivos em `src/`, **não** edite o HTML final manualmente. **Ao salvar alterações na branch `main` do GitHub, o GitHub Actions reconstrói `FINALPROJECT_APHA.html`, executa as verificações e faz automaticamente um segundo commit contendo o HTML atualizado, se necessário. Não é preciso instalar Python no computador para editar pelo GitHub.**

Para executar localmente, opcionalmente, use Python 3.9+ (somente biblioteca padrão):

```bash
python tools/build.py
python tools/build.py --check
```

O `--check` compara o resultado **byte a byte** com o HTML versionado. Em pull requests e em outras branches, o GitHub Actions reconstrói e valida uma cópia temporária, mas **não faz commit**. O script também pode ser iniciado manualmente pela aba *Actions* (`Build and verify standalone HTML` → *Run workflow*).

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

O ponto de verdade é o código modular em `src/`. O HTML final é um artefato gerado. Em alterações feitas diretamente na `main`, a automação o sincroniza em um commit subsequente do `github-actions[bot]` (pode haver um intervalo breve entre os dois commits). Não edite manualmente o HTML gerado.

## Limpeza conservadora de código não utilizado (18/11/2026)

Foram removidas funções sem referência literal, constantes não lidas, seletores SVG `.filNN` sem correspondência fora do CSS e os estilos dos antigos cartões biomecânicos (o overlay não existe mais no HTML). A expressão que desenha os percentis mantém a execução; apenas o array `stats`, que nunca era lido, deixou de ser criado. Funções IIFE e regras potencialmente dinâmicas foram preservadas.

**Intocados nesta limpeza:** as sete estruturas de `src/html/`, `src/js/engine/cad3d.js` (malas, câmera e cotas), `src/js/tour/director-and-recording.js` (cinco takes, suas transições e gravação Full HD) e os demais estilos em uso.

Verificação estática:

```bash
python tools/build.py --check
python tools/verify_preservation.py
```

Esses testes não substituem a reprodução visual das oito abas nem a gravação dos takes em navegador.

## Passageiros: limpeza conservadora e testes

A Aba 1 desenha os três passageiros em `src/pax/js/passengers.js`. As receitas
obsoletas de textura `PT` e as definições sobrescritas foram removidas.
O primeiro passageiro mantém as texturas ativas `TVT`; `PT` guarda somente
receitas ainda usadas pelo senhor, pela mãe e pelo bebê. Geometria de malas,
fábricas de materiais e elementos repetidos de rostos foram consolidados.

**Invariantes preservadas:** cada boneco é criado uma única vez, o senhor e
a mãe mantêm seus tamanhos próprios de nariz, as cores de base `SUIT_C` e
`ELD.suit` não foram confundidas, a manta azul conserva o material original
(`blanket`, `THREE.DoubleSide`), o shader *rich* e suas chaves de cache não
foram alterados, e as chamadas públicas de reprodução/exportação permanecem.

Além de reconstruir o HTML, o GitHub Actions executa:

```bash
node --check src/pax/js/passengers.js
python3 tools/verify_passengers.py
```

Essas verificações detectam regressões estáticas, mas **não substituem**
conferir os três passageiros na Aba 1 e no Take 01 com um navegador WebGL.
