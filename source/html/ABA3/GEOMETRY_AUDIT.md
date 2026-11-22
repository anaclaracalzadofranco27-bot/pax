# Aba 3 — verificação matemática de escala e encaixe

Esta verificação documenta **o que o código calcula**, sem modificar desenhos, escala, cotas, materiais ou posição das malas. Não substitui medição dimensional no CAD de origem ou ensaios físicos.

## Convencional: largura das quatro malas

Valores lidos de `renderers/03-conventional-top-view.js`:

- Contorno de referência: `B.x0=815`, `B.x1=19865`, largura externa de **19.050 unidades SVG**, rotulada como **56 polegadas**.
- Escala de referência: `19050 / 56 = 340,178571...` unidades SVG/polegada.
- Mala nominal IATA: `14 × 340,178571... = 4.762,5` unidades SVG de largura.
- Vão interno na seção usada: `19080 - 1590 = 17.490` unidades SVG.
- Folga lateral: `85` unidades de cada lado; espaçamento: `20` entre malas, três intervalos.
- Vão disponível às quatro malas: `17490 - 2×85 - 3×20 = 17.260`.
- Largura calculada por mala: `min(4762,5 × 0,95; 17260 / 4) = 4.315` unidades SVG.
- Largura final relativa à mala nominal: `4315 / 4762,5 = 90.604%`: **redução de 9.396%**.
- Equivalência **na mesma escala horizontal SVG**: aproximadamente **12.685 polegadas** por mala, *não* 14 polegadas nominais. Não é uma medida física independente.
- Extremos horizontais da fileira: `xStart=1675` e `xEnd=18995`; preservam 85 unidades de folga nominal em cada lateral no cálculo.

Portanto, **as quatro malas da representação convencional não mantêm simultaneamente a largura nominal IATA de 14 polegadas**. Alterar essa proporção mudaria a comparação gráfica e requer decisão específica sobre geometria real, capacidade e escala.

## Altura e transformação do casco

- A referência vertical de bagagem utiliza `22 × (19050/56) = 7483.929` unidades SVG.
- A estrutura vetorial do convencional recebe o fator `SHELL_HEIGHT_FACTOR=0.89` (**compressão visual de 11% na coordenada Y**).
- O posicionamento das malas usa `pVisual` (sem essa compressão), enquanto os caminhos da estrutura recebem a transformação vertical. Assim, a composição **não deve ser tratada como prova de ajuste dimensional físico em escala uniforme**.

## Alpha: cota de 44 polegadas

O Alpha apresenta a cota `44"`, desenhada entre `TH/2` e `DIST-TH/2`, com `DIST=1157` e `TH=12`: vão numérico de **1145 unidades do motor**.

**Se** essas unidades forem milímetros físicos, esse vão corresponderia a **45.079 polegadas**, enquanto 44 polegadas correspondem a **1117.6 mm**. É necessário confirmar no CAD de referência a transformação/unidade adotada antes de afirmar equivalência dimensional ou alterar a cota.

## Limites e decisão

Esta é uma **auditoria aritmética estática** do modelo vigente, não uma validação de colisões em 3D nem uma medição de tolerâncias. A refatoração da Aba 3 preservou integralmente `B`, `SHELL_HEIGHT_FACTOR`, `bagWidthFitted`, `bagHeightSvg`, transformações, câmeras e coordenadas. Correções físicas de escala/encaixe devem ser tratadas separadamente, com referência dimensional comprovada.
