# Aba 1 — Boarding Bridge (avião e passageiros)

Esta pasta implementa o primeiro ato de **14 segundos**. O conteúdo visual é carregado em um `iframe` e participa do **Take 01** da Simulação Geral. Os fontes são montados pelo `tools/build.py` em um único HTML; não é necessário importar novos scripts nem criar pedidos de rede adicionais.

## Estrutura e responsabilidades

| Arquivo | Conteúdo |
|---|---|
| `ABA1.html` | Seção principal e `iframe` da cena |
| `index.template.html` | Ordem dos SVGs, CSS e dos três scripts internos |
| `bridge.js` | Comunicação entre o iframe e as abas/Simulação Geral |
| `styles.css` | Zoom, destaque laranja dos bins e enquadramento 16:9 |
| `presentation.css` | Tamanho e transparência do iframe no palco principal |
| `svg/illustration-01.svg`, `svg/illustration-02.svg` | Ilustração principal e camada vetorial frontal |
| `js/controls.js` | API `window.paxEmbed`, pausa, reset, x-ray |
| `js/aircraft.js` | **Manifesto** de cinco trechos, não executar isoladamente |
| `js/passengers.js` | **Manifesto** de sete trechos, não executar isoladamente |

### `js/aircraft/`

1. `01-palette-and-timeline.js` — cores CAD, relógio e câmera ao vivo.
2. `02-export-setup-and-labels.js` — parâmetros Full HD e balões de passageiros/bins.
3. `03-export-compositor.js` — rasterização SVG e composição dos quadros.
4. `04-mp4-encoder.js` — estrutura de MP4 e codificação H.264.
5. `05-recording-and-download.js` — gravação alternativa e exportação.

### `js/passengers/`

1. `01-scene-and-path.js` — Three.js, câmera e caminho sobre a passarela.
2. `02-painted-textures.js` — manifesto das receitas de cabeça/tinta, senhor, mãe e bebê.
3. `03-shaders-and-materials.js` — contorno, sombreamento toon e materiais.
4. `04-traveler.js` — manifesto da geometria, das texturas e do rig do viajante.
5. `05-elder.js` — personagem idoso e acessórios.
6. `06-mother-and-baby.js` — mãe, bebê, vestuário e articulações.
7. `07-walking-and-render.js` — cadência, caminhada, renderização e API `window.PAX`.

**Importante:** os trechos de cada manifesto formam **um único bloco `<script>`** ao construir o HTML. Os arquivos compartilham escopo e dependências. Não acrescentar `import`, `export`, IIFEs, fechamentos extras ou tags de script individuais: isso mudaria o comportamento e as transições. Os manifestos contêm apenas marcadores `@@APHA_INCLUDE`; não são JavaScript executável isoladamente.

## Alterar e verificar

Edite somente o trecho correspondente à sua mudança. Preserve os parâmetros de câmera, as três trajetórias, `TOTAL_TIME = 14`, `1920×1080`, renderização e a API do `bridge.js`. Depois execute, na raiz do projeto:

```bash
python3 tools/build.py
python3 tools/check_pax_scripts.py
python3 tools/verify_preservation.py
```

O verificador confere o script do **avião** contra o hash da versão anterior e mantém os contratos de geometria/shaders dos **passageiros**. A engine dos passageiros agora possui uma fábrica consolidada de texturas e, por isso, sua soma de verificação original não é mais a mesma. No lugar de aprovar um hash novo sem prova, o CI constrói o HTML da base da PR e compara os três personagens e a renderização em instantes fixos no **Chromium**.

O workflow de navegador (Playwright) também testa a troca das oito abas, a execução/parada dos cinco takes e o encerramento de capturas pendentes; a verificação visual completa e a gravação real do MP4 continuam necessárias para a entrega.

## Limpeza segura: transição X-ray

O controlador `js/controls.js` usa `xrayLayers()` para restaurar somente os **quatro nós** cujo estilo inline é alterado no Take 01. Uma versão anterior também percorria todos os caminhos SVG, sem necessidade: manter o reset restrito aos nós que a transição realmente modifica. Os detalhes de vidro e os contornos da aeronave são parte da composição atual e permanecem intactos.

## Texturas: sistema ativo e limpeza Fase B

As receitas `PT` **não são código morto**: são utilizadas pelo senhor e pela mãe/bebê. As receitas `TVT` produzem as texturas do viajante. Os dois grupos agora compartilham a fábrica `paintedRecipe(w, h, fn, fill?)`; o `paintCloth` foi simplificado e não recebe mais o antigo parâmetro `name`, que não era lido.

- `js/passengers/textures/01-shared-drawing.js`: proporções das cabeças, mapas UV, pintura de curvas e fábrica `paintedRecipe`.
- `js/passengers/textures/02-elder-recipes.js`: receitas `PT` utilizadas pelo senhor e texturas compartilhadas de ouvido/casaco.
- `js/passengers/textures/03-mother-and-baby-recipes.js`: receitas `PT` utilizadas pela mãe e pelo bebê, além da escala compartilhada.
- `js/passengers/traveler/01-materials-and-geometry.js`: geometria, paleta e materiais do viajante.
- `js/passengers/traveler/02-painted-recipes.js`: receitas `TVT` do viajante.
- `js/passengers/traveler/03-rig-and-suitcase.js`: corpo articulado e mala.

**Não misturar as duas paletas nem apagar receitas apenas por serem antigas.** Os três personagens, suas articulações, os materiais mapeados e as texturas originais continuam sendo necessários. Na revisão, compare imagens da Aba 1 nos mesmos instantes com a versão anterior e verifique a presença de malhas e materiais no grafo Three.js. Só depois de validar a diferença é apropriado atualizar as referências estáticas/visuais de testes.

## Auditoria em navegador de malhas e materiais

No workflow `Browser presentation smoke tests`, `tests/browser/aba1-visual-regression.spec.cjs` compara a versão da base da PR com a versão candidata, nos instantes **1, 4, 8 e 11 segundos**. O teste usa o framebuffer WebGL (não um vídeo gravado) e compara os pixels, a visibilidade das três raízes dos personagens, a quantidade de malhas/geometrias/materiais/texturas ligadas a cada raiz e amostras dos pixels das receitas de textura. Se um modelo perder roupa, rosto, cabelo, bebê ou malas, o teste deve detectar a mudança.

**Limitação:** o grafo Three.js mostra recursos alcançáveis, mas por si só não detecta todos os objetos temporários criados e descartados fora da cena. A verificação de referências no código complementa, mas não substitui, essa inspeção. Se uma mudança realmente intencional alterar a aparência, atualizar o teste exige uma nova revisão visual.
