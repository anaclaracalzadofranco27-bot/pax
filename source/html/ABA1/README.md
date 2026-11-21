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
2. `02-painted-textures.js` — receitas e elementos de textura desenhada.
3. `03-shaders-and-materials.js` — contorno, sombreamento toon e materiais.
4. `04-traveler.js` — corpo, roupas, mala e juntas do viajante.
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

O verificador confere os scripts montados contra os **hashes exatos da versão anterior à modularização**. Se você fizer uma alteração visual ou funcional intencional, essa verificação irá falhar até que a mudança tenha sido revisada e os contratos correspondentes atualizados. Não altere os hashes apenas para fazer o teste passar.

O workflow de navegador (Playwright) também testa a troca das oito abas, a execução/parada dos cinco takes e o encerramento de capturas pendentes; a verificação visual completa e a gravação real do MP4 continuam necessárias para a entrega.

## Limpeza segura: transição X-ray

O controlador `js/controls.js` usa `xrayLayers()` para restaurar somente os **quatro nós** cujo estilo inline é alterado no Take 01. Uma versão anterior também percorria todos os caminhos SVG, sem necessidade: manter o reset restrito aos nós que a transição realmente modifica. Os detalhes de vidro e os contornos da aeronave são parte da composição atual e permanecem intactos.
