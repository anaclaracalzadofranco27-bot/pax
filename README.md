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

## Organização por aba

Cada aba possui sua própria pasta em `src/html/ABA1/` até `src/html/ABA8/`.
HTML e recursos exclusivos ficam juntos:

| Pasta | Conteúdo |
| --- | --- |
| `src/html/ABA1/` | `ABA1.html`, `index.template.html`, `styles.css`, `bridge.js`, scripts de avião/passageiros/controles em `js/` e duas ilustrações em `svg/` |
| `src/html/ABA2/` | `ABA2.html` e `cad3d.js` (bin 3D, porta, malas e câmera) |
| `src/html/ABA3/` | `ABA3.html` e `export.js` (exportação da comparação de bins) |
| `src/html/ABA4/` | `ABA4.html`, `animation.js`, `export.js` e desenhos `*.svg.base64` da vista superior |
| `src/html/ABA5/` | `ABA5.html`, `unified-simulation.js` e `door-addon.js` |
| `src/html/ABA6/` | `ABA6.html` e `manikin.js` (manequim e movimentação das malas) |
| `src/html/ABA7/` | `ABA7.html`, `animation.js` e sete ilustrações do encerramento em `svg/` |
| `src/html/ABA8/` | `ABA8.html` e `director-and-recording.js` (Simulação Geral, transições e cinco takes) |

**Arquivos compartilhados**, mantidos fora das pastas das abas:

| Caminho | Responsabilidade |
| --- | --- |
| `src/page.template.html` | Estrutura principal, ordem de inclusão e navegação |
| `src/css/global.css` | CSS, aparência e transições usadas por várias abas |
| `src/js/core/config.js` | Paleta, geometria, linha do tempo e configurações comuns |
| `src/js/engine/cad2d-and-shared.js` | CAD 2D, comparação da Aba 3 e funções compartilhadas |
| `src/js/engine/seated-ergonomics.js` | Ergonomia sentada e funções compartilhadas com a simulação da cabine |

Códigos específicos de uma aba também podem ser **chamados pela Simulação Geral**
(ABA8), mas ficam na pasta de origem. O diretor da ABA8 apenas os coordena.

A montagem pelo `tools/build.py` preserva os elementos `<script>` e `<style>`,
a ordem de execução e os escopos. A Aba 1 mantém o `iframe srcdoc` isolado:
seu conteúdo ainda é escapado corretamente pelo builder. Os SVGs e as imagens
base64 permanecem embutidos no `FINALPROJECT_APHA.html`, independente de `src/`.

## Regras importantes

- **A modularização é de código-fonte, não de carregamento em tempo de execução.** O build reintegra tudo na mesma posição e dentro dos mesmos elementos `<script>`/`<style>`. Os escopos e os objetos globais `window.*` permanecem inalterados.
- O iframe da Aba 1 é inserido como `srcdoc` no HTML final. O build escapa `<script>`, `</script>` e `<!--` somente nessa inclusão; **não altere essa regra**, pois protege o `<script type="text/plain" id="pax-src">` externo.
- Os arquivos `.svg.base64` são o conteúdo exato de imagens SVG já embutidas em JavaScript; permanecem codificados por compatibilidade visual.
- **Nenhuma limpeza de CSS, troca de Three.js, alteração na geometria ou no timing foi feita nesta separação.** Os cinco takes, as oito abas, os cálculos e as transições permanecem como estavam na versão de referência.
- Depois de alterações futuras, valide as oito abas, a Simulação Completa e especialmente o Take 02 (giro CAD → bin Alpha), o Take 03 (seção → manequim) e a exportação Full HD.

O ponto de verdade é o código modular em `src/`. O HTML final é um artefato gerado. Em alterações feitas diretamente na `main`, a automação o sincroniza em um commit subsequente do `github-actions[bot]` (pode haver um intervalo breve entre os dois commits). Não edite manualmente o HTML gerado.

## Limpeza conservadora de código não utilizado (18/11/2026)

Foram removidas funções sem referência literal, constantes não lidas, seletores SVG `.filNN` sem correspondência fora do CSS e os estilos dos antigos cartões biomecânicos (o overlay não existe mais no HTML). A expressão que desenha os percentis mantém a execução; apenas o array `stats`, que nunca era lido, deixou de ser criado. Funções IIFE e regras potencialmente dinâmicas foram preservadas.

**Intocados naquela limpeza:** os módulos originais, hoje em `src/html/ABA1/` até `src/html/ABA8/`, incluindo `src/html/ABA2/cad3d.js` (malas, câmera e cotas), `src/html/ABA8/director-and-recording.js` (cinco takes, suas transições e gravação Full HD) e os demais estilos em uso.

Verificação estática:

```bash
python tools/build.py --check
python tools/verify_preservation.py
```

Esses testes não substituem a reprodução visual das oito abas nem a gravação dos takes em navegador.

## Passageiros: limpeza conservadora e testes

A Aba 1 desenha os três passageiros em `src/html/ABA1/js/passengers.js`. As receitas
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
node --check src/html/ABA1/js/passengers.js
python3 tools/verify_passengers.py
```

Essas verificações detectam regressões estáticas, mas **não substituem**
conferir os três passageiros na Aba 1 e no Take 01 com um navegador WebGL.
