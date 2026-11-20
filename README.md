# Overhead Bin Alpha — fontes modulares

A entrega e a reprodução continuam sendo feitas **exclusivamente pelo arquivo `FINALPROJECT_APHA.html` da raiz**. Ele permanece independente (HTML, CSS, JS, SVG e imagens incorporados) e não depende da pasta `source/` ao ser aberto.

## Como editar

Edite os arquivos em `source/`, **não** edite o HTML final manualmente. **Ao salvar alterações na branch `main` do GitHub, o GitHub Actions reconstrói `FINALPROJECT_APHA.html`, executa as verificações e faz automaticamente um segundo commit contendo o HTML atualizado, se necessário. Não é preciso instalar Python no computador para editar pelo GitHub.**

Para executar localmente, opcionalmente, use Python 3.9+ (somente biblioteca padrão):

```bash
python tools/build.py
python tools/build.py --check
```

O `--check` compara o resultado **byte a byte** com o HTML versionado. Em pull requests e em outras branches, o GitHub Actions reconstrói e valida uma cópia temporária, mas **não faz commit**. O script também pode ser iniciado manualmente pela aba *Actions* (`Build and verify standalone HTML` → *Run workflow*).

## Organização por aba

Cada aba possui sua própria pasta em `source/html/ABA1/` até `source/html/ABA8/`.
HTML e recursos exclusivos ficam juntos:

| Pasta | Conteúdo |
| --- | --- |
| `source/html/ABA1/` | `ABA1.html`, `index.template.html`, `styles.css`, `bridge.js`, scripts de avião/passageiros/controles em `js/` e duas ilustrações em `svg/` |
| `source/html/ABA2/` | `ABA2.html` e `cad3d.js` (bin 3D, porta, malas e câmera) |
| `source/html/ABA3/` | `ABA3.html`, `bin-comparison-renderers.js` (desenho Alpha/convencional e cotas) e `export.js` (PNG) |
| `source/html/ABA4/` | `ABA4.html`, `animation.js`, `export.js` e desenhos `*.svg.base64` da vista superior |
| `source/html/ABA5/` | `ABA5.html`, `unified-simulation.js` e `door-addon.js` |
| `source/html/ABA6/` | `ABA6.html`, `manikin.js` e `controller.js` (início, pausa e sincronização da animação) |
| `source/html/ABA7/` | `ABA7.html`, `animation.js` e sete ilustrações do encerramento em `svg/` |
| `source/html/ABA8/` | `ABA8.html` e `director-and-recording.js` (Simulação Geral, transições e cinco takes) |

**Arquivos compartilhados**, mantidos fora das pastas das abas:

| Caminho | Responsabilidade |
| --- | --- |
| `source/page.template.html` | Estrutura principal, ordem de inclusão e navegação |
| `source/css/global.css` | Regras globais e inclusões ordenadas de CSS específico |
| `source/css/recording-and-transitions.css` | Ajustes do quadro de vídeo, modo de gravação, enquadramento 16:9 e cursor |
| `source/js/core/config.js` | Leitura da paleta CSS para Canvas, geometria e tempos/câmera das animações |
| `source/js/core/tailwind-theme.js` | Adaptador de classes de cor/fonte exigido pelo Tailwind CDN (embutido no script de `config.js`) |
| `source/js/core/navigation.js` | Estado da aba ativa e função `switchTab()` para navegar entre as oito abas |
| `source/js/engine/cabin-shared.js` | Motor CAD e biomecânico compartilhado pelas Abas 5 e 6 (reutilizado na Aba 8): paleta Canvas, geometria, perfis e malas, manequins, cinemática, renderização e ergonomia sentada |

**Mapa interno do `cabin-shared.js` (19/11/2026):** o motor continua em **um único arquivo**, mas agora apresenta um índice e oito blocos numerados, com 13 subdivisões para localizar funções rapidamente. Os cabeçalhos são comentários: não foram movidas nem modificadas funções, variáveis, fórmulas, caminhos SVG ou diretivas de inclusão.

| Bloco | Conteúdo | O que procurar |
| --- | --- | --- |
| 01 — Paleta Canvas | Remapeamento de cores para a simulação biomecânica | `installDarkPalette()` |
| 02 — Geometria geral | Unidades, inclusão da navegação/controlador, geometria e cotas | `computeAllGeometries()`, `drawDimensionLine()` |
| 03 — Bins e malas | Perfis Alpha/convencional, contornos e desenho das malas | `traceBinAlphaProfile()`, `traceEmbraerBinProfile()`, `drawRealisticSuitcase()` |
| 04 — Manequins | Componentes articulados e boneco completo | `drawDummyFrontFigure()` |
| 05 — Cinemática CAD | Geometria exata, portas, caches, intradorso e indicadores | `solveAlphaTheta()`, `drawReferenceBins()`, `updateHeightReadouts()` |
| 06 — Renderização CAD | Montagem visual da fuselagem, bins, malas e cotas | `drawCADCanvas()` |
| 07 — Motor da Aba 6 | Inclusão de `ABA6/manikin.js` no ponto histórico | Diretiva de inclusão da Aba 6 |
| 08 — Ergonomia sentada | Assentos, passageiros, folgas e estatísticas públicas | `drawSeatedScene()`, `SEATED_STAT` |

**Como manter:** procure `BLOCO 05/08` para mudar a geometria CAD ou `BLOCO 06/08` para alterar sua composição visual. Preserve a ordem dos blocos e as três inclusões de `navigation.js`, `controller.js` e `manikin.js`. O verificador agora confere a posição e a existência desses comentários; essa documentação não substitui testes visuais em navegador.


**Separação entre CSS e JavaScript (19/11/2026):** `source/css/global.css` define uma única paleta `:root` com tokens `--apha-*`; o CSS controla cores, quadriculado, bordas e aparência. `source/js/core/config.js` lê esses valores com `getComputedStyle` para o desenho Canvas e mantém geometria, temporizações e movimentos. A configuração de classes do Tailwind CDN foi isolada em `source/js/core/tailwind-theme.js`, embutida no mesmo bloco `<script>` por `@@APHA_INCLUDE`; por ser um requisito da biblioteca, permanece em JavaScript, mas consome a paleta do CSS. O `<style>` global fica antes do script de configuração para as cores estarem disponíveis imediatamente. A montagem continua em um único HTML, sem requisições adicionais, e mantém os mesmos valores de cor e parâmetros da simulação. As verificações de preservação conferem essa ligação.

**CSS modular por aba:** os estilos visuais antes misturados em `source/css/global.css` foram colocados nas pastas das abas, com arquivos de responsabilidade específica:

- `source/html/ABA1/`: `presentation.css` (iframe do avião no palco principal; não substitui `styles.css` do próprio iframe).
- `source/html/ABA2/`: `cad-hud.css` (balões, cotas e HUD do CAD 3D) e `recording-layout.css` (altura do CAD durante a gravação).
- `source/html/ABA3/`: `tour-layout.css`, `presentation.css` e `recording-layout.css` (comparação, cabeçalho e margens de 2,2% na gravação).
- `source/html/ABA4/`: `tour-layout.css` (vista superior dentro do roteiro).
- `source/html/ABA5/`: `viewport-theme.css` e `tour-layout.css` (seção da cabine).
- `source/html/ABA6/`: `viewport-theme.css`, `tour-layout.css` e `fullscreen.css` (viewport e manequim).
- `source/html/ABA7/`: `closing-frame.css`, `closing-scenes.css` e `closing-illustrations.css` (encerramento).
- `source/html/ABA8/`: `tour-frame.css`, `tour-controls-hidden.css`, `tour-pax.css`, `tour-buttons.css` e `tour-closing.css` (direção e montagem das cenas).

O `global.css` é o único ponto de entrada do CSS principal e conserva as regras gerais. Ele referencia os novos arquivos por meio de `@@APHA_INCLUDE`, **sem mudar a ordem original das declarações**; o `tools/build.py` gera exatamente o mesmo HTML autossuficiente, com as mesmas prioridades CSS. `ABA5/viewport-theme.css` também guarda a regra exclusiva que oculta o painel de título legado da Aba 5, enquanto `source/css/recording-and-transitions.css` concentra os estilos gerais do modo de gravação. **Não** importe os arquivos novamente com `<link>` ou outras tags `<style>`: eles já são embutidos pelo montador.

**CSS de gravação por aba:** as regras específicas do CAD 3D e da comparação dos bins foram transferidas para `ABA2/recording-layout.css` e `ABA3/recording-layout.css`. O arquivo `source/css/recording-and-transitions.css` mantém apenas os estilos compartilhados e três inclusões aninhadas, na ordem original: ABA2 → ABA3 → ABA6. O montador preserva as regras e o CSS final **byte a byte**, sem alterar enquadramentos, transições ou takes.

**Remoção de CSS compartilhado residual:** `source/css/shared-viewport.css` foi excluído, pois continha somente uma regra exclusiva da Aba 5 e uma declaração `row-gap:0` sem efeito nos contêineres de bloco atuais. A regra do painel de título da Aba 5 foi movida para `ABA5/viewport-theme.css`; o cabeçalho da Aba 6 e a visualização sem título na Simulação Geral continuam com seus próprios estilos. A importação e as verificações antigas foram removidas.

**Malha blueprint nas Abas 5 e 6:** na visualização individual, os viewports `.sim-bg` usam a grade CSS uniforme de 48 × 48 px em **toda** a extensão, sem os antigos overrides de fundo liso. Os canvases dessas abas deixam a camada de fundo transparente e não duplicam a grade física restrita à câmera. Na **Simulação Geral (Aba 8)**, só a malha fixa de `#tour-stage` é exibida; o desenho do CAD, os manequins, as transições e as exportações isoladas permanecem coordenados pelos motores atuais. Arquivos relevantes: `ABA5/viewport-theme.css`, `ABA5/unified-simulation.js`, `ABA6/viewport-theme.css`, `ABA6/manikin.js` e `source/js/engine/cabin-shared.js`.

**Moldura do canvas da Aba 6:** a simulação individual usa a estrutura `aba6-sim-card sim-card` com borda azul-acinzentada, cantos arredondados e separação de 14 px abaixo de `aba6-header`, como os cartões das outras abas. A Aba 8 mantém a mesma cena sem moldura ou espaçamento extra, para preservar o enquadramento do Take 03. As mudanças ficam apenas no HTML/CSS da Aba 6; canvas, JavaScript, transições e resolução de exportação permanecem inalterados.

**Cabeçalhos da Aba 6:** ao selecionar a Aba 6, o cabeçalho superior com a logo e os oito botões permanece visível, como nas outras abas. O painel interno `Biomechanical Validation & Boarding Time` em `ABA6.html` também fica visível. A antiga regra de tela cheia que escondia o `<header>` e a regra compartilhada que ocultava o título foram removidas; o viewport individual usa uma altura limitada sem cobrir a navegação. `ABA6/tour-layout.css` continua ocultando **somente o título interno durante a Simulação Geral**, preservando o take das Abas 5 e 6. A regra de gravação específica da ABA6 está em `ABA6/recording-layout.css`.

**Controle da Aba 6:** `controller.js` contém `initAba6Engine()`, `scheduleAba6Engine()` e `pauseAba6Engine()`, usadas pela própria Aba 6 e pelo diretor da Aba 8. `cabin-shared.js` incorpora `navigation.js` e o controlador na **posição original, dentro do mesmo `<script>`** por `@@APHA_INCLUDE`. Nenhum deles é carregado por uma tag de script separada, preservando a ordem de execução e as transições.

**Auditoria dos chamadores (19/11/2026):** `drawCADCanvas()` é chamado na Aba 5 com `referenceBins: true`, exibindo apenas `drawUniReferenceBins()`. Por outro lado, `traceBinAlphaProfile()` permanece necessário para a alternativa de segurança usada por `ABA6/manikin.js`. A próxima etapa de otimização, se necessária, seria calcular as curvas convencionais independentemente do desenho e pré-computar os `Path2D` estáticos, validando as dimensões e fotogramas. O interceptador de cores e os modos de renderização genéricos continuam existentes; removê-los sem validação visual seria arriscado.

**Limpeza breve dos bins e referências CAD (19/11/2026):** `source/js/engine/cabin-shared.js` agora lê **raio de 137,16 cm** e **centro Y de 62,84 cm** diretamente de `APHA_CABIN_GEOMETRY` (`core/config.js`), inclusive no desenho CAD convencional realmente exibido. O valor de abertura da porta convencional visível permanece em **82°**; o mecanismo obsoleto de 39° foi removido após confirmar que o valor arredondado da ponta fechada era 153,04 cm, igual ao CAD visível. Com `referenceBins: true`, o motor não desenha mais os dois perfis históricos com transparência zero: chama diretamente `drawUniReferenceBins()` e preserva apenas três coordenadas de referência usadas pelas cotas externas. Nas cenas que não utilizam `referenceBins`, os perfis vetoriais originais permanecem disponíveis. O resultado de `getUniAlphaGeometry()` também é reutilizado enquanto o ângulo CAD não mudar. O CAD exato, as portas, os SVGs, as posições dos manequins e o roteiro/takes não foram reescritos. Os testes verificam as referências físicas, o valor final de 82° e o caminho de desenho ativo; **a comparação visual quadro a quadro continua recomendada**.

**Limpeza do legado CAD da Aba 5 (19/11/2026):** após conferir os chamadores, `computeLeftBinAtY()` e sua porta de 39° foram eliminados. Seus únicos valores consumidos eram as alturas convencionais e o progresso legado; agora `updateHeightReadouts()` usa `CONV_CAD_BASE_Y_CM=138.50` e `CONV_CAD_TIP_Y_CM=153.04` (cm), da geometria que aparece na simulação. A antiga cota era 153,0428 cm e, arredondada para duas casas, permanece 153,04 cm. Foram retirados `vectorBinUnderY()`, `BIN_VEC_POLY`, `NULLCTX`, argumentos sem uso e o percurso SVG sobrescrito por `beginPath()`. Não foram modificados os 82° da porta visível, os caminhos SVG do Alpha ou o fallback vetorial da Aba 6. A cota do intradorso convencional ainda depende do desenho final e pede desacoplamento e testes geométricos posteriores.

**Consolidação do motor compartilhado (19/11/2026):** os sete fragmentos CAD antes armazenados separadamente foram reunidos em um único arquivo `source/js/engine/cabin-shared.js`, pois atendem às mesmas simulações: Abas 5 e 6, reutilizadas pela Aba 8. Esta alteração apenas expande as inclusões anteriores exatamente no mesmo ponto, sem modificar nenhuma fórmula ou alterar a ordem, de forma que o HTML montado permanece **idêntico, byte a byte**. As inclusões de `core/navigation.js`, `ABA6/controller.js` e `ABA6/manikin.js` continuam na posição original, dentro do mesmo `<script>`, e esses arquivos específicos permanecem em suas próprias pastas. `switchTab()` continua em `core/navigation.js`; não são usados módulos ES6, scripts externos adicionais nem novos pontos de entrada. `tools/verify_preservation.py` valida a organização monolítica e a ordem das dependências.

**Dependência importante da Aba 3:** `bin-comparison-renderers.js` pertence à comparação visual (dois bins, cotas de 44″ e 56″), mas utiliza a geometria, os materiais, as malas e a cena do motor `ABA2/cad3d.js`. Por isso, `ABA2/cad3d.js` contém um `@@APHA_INCLUDE` para inserir esse arquivo **dentro da função `initCAD3DModule()`**, exatamente onde o código estava. Ele **não** deve ser incluído como `<script>` separado. O resultado montado permanece idêntico, sem duplicar motores Three.js.

Códigos específicos de uma aba também podem ser **chamados pela Simulação Geral**
(ABA8), mas ficam na pasta de origem. O diretor da ABA8 apenas os coordena.

A montagem pelo `tools/build.py` preserva os elementos `<script>` e `<style>`,
a ordem de execução e os escopos. A Aba 1 mantém o `iframe srcdoc` isolado:
seu conteúdo ainda é escapado corretamente pelo builder. Os SVGs e as imagens
base64 permanecem embutidos no `FINALPROJECT_APHA.html`, independente de `source/`.

## Regras importantes

- **A modularização é de código-fonte, não de carregamento em tempo de execução.** O build reintegra tudo na mesma posição e dentro dos mesmos elementos `<script>`/`<style>`. Os escopos e os objetos globais `window.*` permanecem inalterados.
- O iframe da Aba 1 é inserido como `srcdoc` no HTML final. O build escapa `<script>`, `</script>` e `<!--` somente nessa inclusão; **não altere essa regra**, pois protege o `<script type="text/plain" id="pax-src">` externo.
- Os arquivos `.svg.base64` são o conteúdo exato de imagens SVG já embutidas em JavaScript; permanecem codificados por compatibilidade visual.
- **Nenhuma limpeza de CSS, troca de Three.js, alteração na geometria ou no timing foi feita nesta separação.** Os cinco takes, as oito abas, os cálculos e as transições permanecem como estavam na versão de referência.
- Depois de alterações futuras, valide as oito abas, a Simulação Completa e especialmente o Take 02 (giro CAD → bin Alpha), o Take 03 (seção → manequim) e a exportação Full HD.

O ponto de verdade é o código modular em `source/`. O HTML final é um artefato gerado. Em alterações feitas diretamente na `main`, a automação o sincroniza em um commit subsequente do `github-actions[bot]` (pode haver um intervalo breve entre os dois commits). Não edite manualmente o HTML gerado.

## Limpeza conservadora de código não utilizado (18/11/2026)

Foram removidas funções sem referência literal, constantes não lidas, seletores SVG `.filNN` sem correspondência fora do CSS e os estilos dos antigos cartões biomecânicos (o overlay não existe mais no HTML). A expressão que desenha os percentis mantém a execução; apenas o array `stats`, que nunca era lido, deixou de ser criado. Funções IIFE e regras potencialmente dinâmicas foram preservadas.

**Intocados naquela limpeza:** os módulos originais, hoje em `source/html/ABA1/` até `source/html/ABA8/`, incluindo `source/html/ABA2/cad3d.js` (malas, câmera e cotas), `source/html/ABA8/director-and-recording.js` (cinco takes, suas transições e gravação Full HD) e os demais estilos em uso.

**Verificador aprimorado:** `tools/verify_preservation.py` agora organiza as checagens em 13 grupos por responsabilidade, acumula os problemas encontrados e retorna código de saída diferente de zero se houver alguma falha. Arquivos ausentes são relatados com caminho e causa, sem impedir a análise das demais áreas. As verificações usam funções explícitas em vez de `assert`, funcionando também com `python -O`. Os estilos CSS históricos continuam obrigatórios, enquanto novos includes CSS são descobertos e validados automaticamente. Comparações simples de CSS toleram diferenças de espaços; a verificação não substitui ensaios visuais em navegador.

Verificação estática:

```bash
python tools/build.py --check
python tools/verify_preservation.py
```

Esses testes não substituem a reprodução visual das oito abas nem a gravação dos takes em navegador.

**Verificação consolidada (18/11/2026):** os contratos completos dos passageiros (três construções, anatomia, manta, cores, shaders, receitas de textura e detecção de código obsoleto) foram incorporados ao `tools/verify_preservation.py` em uma seção dedicada à Aba 1. O antigo `tools/verify_passengers.py` foi excluído; o GitHub Actions executa um único verificador Python para as oito abas, os cinco takes, a resolução Full HD e os testes de passageiros. O `node --check` da Aba 1 continua separado por ser uma checagem sintática JavaScript. Nenhuma lógica da apresentação nem o HTML gerado foi modificada.

## Passageiros: limpeza conservadora e testes

A Aba 1 desenha os três passageiros em `source/html/ABA1/js/passengers.js`. As receitas
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
node --check source/html/ABA1/js/passengers.js
python3 tools/verify_preservation.py
```

Essas verificações detectam regressões estáticas, mas **não substituem**
conferir os três passageiros na Aba 1 e no Take 01 com um navegador WebGL.


## Estabilidade da apresentação final (branch de refatoração)

A Simulação Geral usa um único handler para finalizar vídeo/PNG, impede capturas concorrentes, invalida a inicialização de abas já abandonadas e para o roteiro se uma etapa ultrapassar o limite configurado. O início da captura de fotogramas ocorre **antes** da reprodução do roteiro. Os cinco takes e as geometrias existentes não foram alterados.

O utilitário de download `source/js/core/download.js` é embutido pelo `core/config.js`, sem criar nova tag `<script>` no HTML final. A malha blueprint de 48 px é definida uma vez em `global.css` e compartilhada entre `.sim-bg`, `.tour-frame` e `#closing-host`. O iframe da Aba 1 preserva suas APIs isoladas.

Para executar os testes em navegador (Chromium, requer internet para as bibliotecas CDN):

```bash
python tools/build.py
python tools/verify_preservation.py
npm install --no-save @playwright/test@1.56.0
npx playwright install chromium
npx playwright test
```

O workflow `Browser presentation smoke tests` executa automaticamente em pull requests. Ele cobre navegação rápida entre as oito abas e **início/parada** dos cinco takes; **não** substitui a conferência visual completa de duração, enquadramento 1920×1080, transições e gravação real do MP4, que necessita permissão de captura no navegador.
