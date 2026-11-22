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
| `source/html/ABA2/` | `ABA2.html`, CSS de HUD e gravação e manifesto `cad3d.js` com 11 arquivos em `cad3d/` |
| `source/html/ABA3/` | `ABA3.html`, manifesto `bin-comparison-renderers.js` (3 fragmentos em `renderers/`), `export.js`, CSS e `GEOMETRY_AUDIT.md` |
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

**Dependência importante da Aba 3:** `bin-comparison-renderers.js` utiliza a geometria e as malas da Aba 2 e é incorporado pelo manifesto `ABA2/cad3d.js` **dentro da função `initCAD3DModule()`**, depois dos controles e antes dos exportadores. Não o inclua como `<script>` separado: o escopo compartilhado e a ordem de execução são necessários.

Códigos específicos de uma aba também podem ser **chamados pela Simulação Geral**
(ABA8), mas ficam na pasta de origem. O diretor da ABA8 apenas os coordena.

A montagem pelo `tools/build.py` preserva os elementos `<script>` e `<style>`,
a ordem de execução e os escopos. A Aba 1 mantém o `iframe srcdoc` isolado:
seu conteúdo ainda é escapado corretamente pelo builder. Os SVGs e as imagens
base64 permanecem embutidos no `FINALPROJECT_APHA.html`, independente de `source/`.

## Aba 2 — CAD 3D modularizado

`source/html/ABA2/cad3d.js` agora é um **manifesto**, expandido por `tools/build.py` na mesma função e no mesmo bloco `<script>` do HTML final. Os 11 fragmentos em `source/html/ABA2/cad3d/` são:

| Fragmento | Responsabilidade |
| --- | --- |
| `01-bin-geometry.js` | Perfil, laterais, paredes e piso |
| `02-tambour-door-and-hud.js` | Trilho, segmentos da porta e balão informativo |
| `03-suitcase-model-and-dimensions.js` | Geometria IATA, contornos e cotas |
| `04-placement-and-clearances.js` | Destinos das quatro malas, trajetória e folgas |
| `05-camera-and-renderer.js` | Câmera, render, resize e aquecimento GPU |
| `06-simulation.js` | Carregamento animado e preparação do roteiro |
| `07-tour-transition.js` | Morfismo da Aba 2 para a Aba 3 |
| `08-controls.js` | Botões, slider, mouse e zoom |
| `09-export-common.js` | Viewport 4K, snapshot/restauração e download PNG |
| `10-export-images.js` | Três exportações 4K principais |
| `11-export-side.js` | Duas exportações laterais alternativas |

**Ordem essencial:** o manifesto incorpora `ABA3/bin-comparison-renderers.js` entre `08-controls.js` e `09-export-common.js`, no mesmo escopo. Os fragmentos não são scripts independentes.

**Etapa A:** eliminados a função `near()` sem chamada, o array vazio `topWall` e sua iteração, as constantes `LILAC` e `LILAC_D`, as vistas `front` e `top` sem uso, um índice desnecessário, um `forEach` de elemento único e a ramificação não chamada da vista lateral no exportador principal. Comentários de transição foram corrigidos.

**Etapa B:** exportadores mantêm ângulos, visibilidade e materiais próprios, mas agora compartilham a criação dos PNGs, a configuração 3840 × 2160 e os snapshots/restaurações de câmera e malas. Permanecem os 72 segmentos da porta de 5 mm, as quatro malas IATA, a sequência de 5,9 s, as cotas e os cinco PNGs possíveis.

**Testes:** o GitHub Actions reconstrói o HTML, executa `node --check` no CAD já expandido junto ao renderer da Aba 3 e verifica contratos em `tools/verify_preservation.py`. Também é necessária conferência visual WebGL da Aba 2, do Take 02 e dos PNGs 4K.

## Aba 3 — comparação Alpha × convencional

**Limpeza pontual dos renderizadores (22/11/2026).** A estrutura de arquivos,
os três fragmentos e o manifesto permanecem os mesmos. Em
`renderers/03-conventional-top-view.js`, foram retiradas quatro atribuições
redundantes que colocavam novamente a mesma referência de material nas malas
clonadas; a ocultação dos contornos originais continua ativa. O renderizador
convencional evita chamar `setPixelRatio` e `setSize` quando não houve
mudança, e observa somente seu próprio painel para atualizações de tamanho.
Em `renderers/02-alpha-top-view.js`, a resolução WebGL e a projeção só são
reconfiguradas quando necessário; uma matriz temporária é reutilizada para
posicionar os mesmos nove traços de contorno, com espessura e geometria
inalteradas. Os comentários agora distinguem explicitamente compartilhamento
de materiais e sobreposições visuais intencionais.

As cotas de 44/56 polegadas, o SVG do convencional, as quatro malas, as
transições para a Aba 3 e os estados de exportação permanecem conforme o
modelo anterior. As verificações estáticas cobrem esses invariantes; a
inspeção visual dos renders e do Take 02 ainda é recomendada.

`source/html/ABA3/bin-comparison-renderers.js` é um **manifesto**, incorporado dentro da mesma função `initCAD3DModule()` da Aba 2, **sem criar scripts ou escopos adicionais**. Ordem dos fragmentos em `source/html/ABA3/renderers/`:

1. `01-dimensions.js`: cotas compartilhadas (44″ Alpha; 56″ convencional).
2. `02-alpha-top-view.js`: cópia da cena Three.js Alpha, stencil, câmera e contornos tracejados.
3. `03-conventional-top-view.js`: sete caminhos SVG do convencional, malas, câmera ortográfica, captura de canvas e cabeçalho.

**Integração:** `ABA2/cad3d.js` mantém a inclusão única de `ABA3/bin-comparison-renderers.js` após `08-controls.js` e antes dos exportadores. Os três fragmentos devem ser concatenados nessa ordem. O `export.js` continua no bloco `<script>` original e agora restaura exatamente os estados prévios de `__novaNoDim`, `__convNoDim` e `__novaK`, inclusive quando antes não existiam; também tenta redesenhar os dois renderizadores separadamente após erros.

**Verificação geométrica:** consulte [`GEOMETRY_AUDIT.md`](source/html/ABA3/GEOMETRY_AUDIT.md). O cálculo visual atual reduz a largura nominal de cada mala convencional em aproximadamente **9.396%** e comprime verticalmente o casco por 11%. A escala e as posições **não foram alteradas** nesta refatoração; a comparação requer revisão de engenharia antes de ser apresentada como demonstração física exata de quatro malas IATA em 56 polegadas.

**Validação de preservação:** a CI verifica a estrutura dos três fragmentos, a sintaxe JS montada e a restauração de estados de exportação. Recomenda-se ainda conferir a Aba 3, o Take 02 e o PNG exportado em navegador com WebGL.

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

## Aba 1 — scripts do avião modularizados

`source/html/ABA1/js/aircraft.js` agora é um manifesto de quatro fragmentos,
montados pelo `tools/build.py` dentro do mesmo `<script>` e escopo original:

| Fragmento em `source/html/ABA1/js/aircraft/` | Responsabilidade |
| --- | --- |
| `01-aircraft-scene.js` | Paleta, caminhos SVG e identificação visual das malas |
| `02-aircraft-playback.js` | Play, pause, restart, scrubber e roteiro de 14 segundos |
| `03-aircraft-overlays-and-frames.js` | Balões, zoom, camadas e composição de quadros |
| `04-aircraft-video-export.js` | Codificação MP4/WebM e download Full HD |

A divisão somente reorganiza o código original, preservando as fórmulas,
o zoom, os shaders, as cores, os tempos e o contrato de exportação.
O GitHub Actions verifica a sintaxe do avião **já montado**, além de
validar os oito módulos de passageiros e os cinco takes.
### Esqueleto compartilhado e renderização ociosa

As três construções dos personagens reutilizam somente a hierarquia e as
posições idênticas de pivôs em `passengers/04-model-tools.js`: pelve, tórax,
ombro, cotovelo, quadril, joelho, tornozelo e pé. Os comprimentos anatômicos
foram centralizados em `PAX_LIMB`. As receitas de `tvLoft`, materiais,
cores, roupas, cabelo, bebê, malas, escalas e poses individuais foram
preservadas nos próprios construtores.

Em `passengers/08-animation.js`, o loop `requestAnimationFrame` permanece
ativo para observar zoom CSS e scrubber, mas evita `updateWalk()` e o render
WebGL enquanto pausa, tempo e zoom estiverem inalterados. Resize e término
de exportação forçam o próximo desenho. Em `04-model-tools.js`, o cabelo
não recalcula vértices na mesma pose, exceto ao inicializar novos atributos
de normais de contorno. `PAX.renderAt()` continua independente e preciso.

Recomenda-se validar visualmente Play/Pause, 14 s de animação, X-ray,
retorno da Simulação Geral e a exportação 1920 × 1080 no navegador.
## Passageiros: limpeza conservadora e testes

A Aba 1 compõe os três passageiros pelo manifesto `source/html/ABA1/js/passengers.js`.
Ele é expandido pelo `tools/build.py` como **um único script e escopo**, na ordem:
`01-scene-and-path.js` (câmera e percurso), `02-textures-and-faces.js` (rostos e
pinturas), `03-toon-rendering.js` (shaders), `04-model-tools.js` (fábricas de
malhas e mala), `05-traveler.js` (viajante), `06-elder.js` (senhor),
`07-mother-and-baby.js` (mãe e bebê), `08-animation.js` (rigs, marcha e render).
Os oito fragmentos ficam em `source/html/ABA1/js/passengers/` e **não devem ser
executados isoladamente**.

A organização preserva as texturas ativas `TVT` do viajante e as receitas `PT`
ainda usadas pelo senhor, pela mãe e pelo bebê. A constante morta `BLANKET_W`
foi removida; `paintCloth` perdeu o parâmetro `name` sem uso. Os desenhos,
cores, perfis, poses, tempos e shaders ativos permaneceram inalterados.
A transição X-ray agora restaura apenas as quatro camadas que efetivamente
modifica, sem percorrer paths do SVG.

**Invariantes preservadas:** cada boneco é criado uma única vez, o senhor e
a mãe mantêm seus tamanhos próprios de nariz, as cores de base `SUIT_C` e
`ELD.suit` não foram confundidas, a manta azul conserva o material original
(`blanket`, `THREE.DoubleSide`), o shader *rich* e suas chaves de cache não
foram alterados, e as chamadas públicas de reprodução/exportação permanecem.

Além de reconstruir o HTML, o GitHub Actions executa:

```bash
python3 -c "from pathlib import Path; from tools.build import expand; Path('/tmp/apha-passengers.js').write_bytes(expand('source/html/ABA1/js/passengers.js'))"
node --check /tmp/apha-passengers.js
python3 tools/verify_preservation.py
```

Essas verificações detectam regressões estáticas, mas **não substituem**
conferir os três passageiros na Aba 1 e no Take 01 com um navegador WebGL.


## Aba 2 — limpeza de arestas, WebGL e exportação 4K

A malha do piso do `cad3d/01-bin-geometry.js` agora desenha as duas
extremidades transversais somente uma vez; as demais faces, linhas CAD,
malas, porta e perfis não foram modificados.

Em `cad3d/09-export-common.js` ficam o snapshot e a restauração
compartilhados de materiais, cores, malas, porta, câmera (`fov`, `aspect`,
`up` e `viewOffset`) e resolução. Os dois exportadores continuam com
opacidades próprias e conservam as cinco imagens com os nomes originais.

Os arquivos `10-export-images.js` e `11-export-side.js` restauram o
estado com `try/finally`, inclusive quando o PNG falha. Mantêm os
intervalos de 700 ms entre três imagens e de 400 ms entre as duas vistas
laterais, respectivamente. A câmera retorna sem executar novamente
`rs()`. Em `05-camera-and-renderer.js`, o pré-aquecimento só é marcado
como concluído após êxito e retorna à imagem original mesmo em erro;
redimensionamentos sem alterações deixam de recriar o buffer WebGL.

Verificações: `python3 tools/verify_preservation.py` e
`node tools/test_cad3d_exports.js`. O segundo teste simula falhas
de download e confirma restauração de estado e dos cinco nomes de PNG,
sem precisar de GPU. A comparação visual do CAD, do Take 02 e dos PNGs
reais deve ser conferida em navegador WebGL.


## Aba 4 — limpeza conservadora do Canvas 2D (22/11/2026)

- A Aba 4 **não usa o renderizador Three.js da Aba 3**. Desenha a cabine,
  os módulos Alpha/convencional, as cotas e o detalhe S em `topCanvas`.
  Os dois SVGs originais de `aircraft.svg.base64` e
  `detail-s.svg.base64` continuam embutidos, sem alteração dos vetores.
- `animation.js`: remove `capIdx`, os nomes não usados das seis etapas,
  `fadeD=1`, `A.lay` e as três APIs públicas sem chamadas
  (`topSetDetOut`, `topSetBinA`, `topModules`), junto com os seus estados.
  As APIs de reprodução usadas pela Aba 8 continuam intactas.
- `ABA4.html`: não possui mais `top-scrub`; a Simulação Geral continua
  sincronizada por `topTourSet`, `topSetOv` e `topTourStartAt`.
  O botão Replay permanece igual.
- A Aba 4 não altera mais `ERGO_DARK`, `BIN_SOLID` e `BIN_DARK`,
  flags de paleta de outras abas, pois seus próprios bins são Canvas RGB.
  As dimensões 44/56", as posições do detalhe S e os tempos permanecem.
- O tratamento de `onload`/`onerror` dos SVGs agora registra falhas
  e permite que os demais elementos sejam desenhados. `rasterOf()`
  mantém o cache por resolução, evita repetir erros por quadro e permite
  retry após mudança de tamanho.
- O `ResizeObserver` ignora mudanças de altura provocadas pelo próprio
  `draw()`. Valores geométricos e fontes constantes saíram do ciclo de
  desenho. `tour-layout.css` teve apenas comentários e formatação
  reorganizados.
- `export.js` foi formatado e documentado. `topExportPNG()` foi
  **mantido deliberadamente** como exportação manual opcional de
  `top-view.png`, apesar de não existir botão na interface.

Teste estático: `python3 tools/verify_preservation.py`. O HTML final
é montado via `python3 tools/build.py` e validado pelo GitHub Actions.
A conferência visual do Take 02 e dos desenhos Canvas deve ser feita em
navegador antes de considerar equivalência quadro a quadro.


### Aba 4 — revisão fina de comentários e operações repetidas (22/11/2026)

`animation.js` mantém geometrias, cores, cotas de 44"/56" e durações originais.
A documentação foi padronizada em português: as cotas permanecem, as
janelas S incluem etiquetas e `topTourDone()` informa apenas o marco
temporal final (não desenha o selo de capacidade).

O fator `kk=s/50` agora é calculado uma vez por quadro, a instância de
`CanvasRenderingContext2D` é obtida somente na inicialização e o
texto fixo de Replay deixa de ser reatribuído durante a animação.
Foram mantidos os dois SVGs Base64, todas as APIs de sincronização da
Aba 8, os cinco takes e as coordenadas da seção S. As verificações
estáticas cobrem as três otimizações; a reprodução visual ainda requer
teste em navegador.


## Aba 5 — primeira fase de correção (22/11/2026)

A simulação integrada continua no mesmo `uniCanvas` e usa a geometria CAD
compartilhada, sem alterar a fuselagem, os quatro passageiros, as cotas, o
zoom, a porta convencional de 82° ou a tambour Alpha. `uniEnter()` agora
compara o tempo com `TOTAL` (a antiga propriedade `TL.total` era indefinida),
permitindo Replay após o fim.

`door-addon.js` centraliza a porcentagem, o slider e o texto do botão.
Play, scrub, Replay e a direção da Aba 8 assumem modo automático e cancelam
animação manual pendente; slider e botão assumem modo manual e não são mais
sobrescritos em `refresh()`. `uniPause()` também interrompe o movimento
manual ao deixar a aba. A velocidade de 950 ms e o easing do botão permanecem.

`uniExport4K()` usa snapshot de relógio, estatura, modo da porta, flags
temporárias e enquadramento, com restauração em `finally` mesmo após falha
de desenho ou serialização. A opção `world_average` exporta 165 cm até
mesmo após a última cena; o estado final das portas e o tamanho UHD 3840×2160
permanecem. O PNG P95 mantém o fundo transparente/paleta escura solicitados.
O controlador impede duas capturas simultâneas.

Foram retirados `U.started` e `const act = phaseIdx()`, não utilizados,
além de uma regra CSS de ocultação redundante. O botão Play não reconstrói
o SVG/HTML quando seu estado permanece igual. Os comentários foram
atualizados para distinguir camadas intencionais dos controladores legados.

Testes: `node tools/test_aba5_controls.js` verifica animação manual,
reprodução, sincronização, conteúdo/nomes dos PNGs e recuperação após falhas
simuladas. `python3 tools/verify_preservation.py` cobre invariantes estáticos.
Esses testes não substituem conferir os quatro passageiros, portas, zoom e
a continuidade para a Aba 6 no Take 03 em navegador.
