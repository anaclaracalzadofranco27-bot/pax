#!/usr/bin/env python3
"""Testes estáticos consolidados do Overhead Bin Alpha.

O verificador não substitui reprodução visual, WebGL nem gravação real.
"""
from __future__ import annotations
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TABS = ("pax", "cad3d", "nova", "topview", "unified", "sim", "closing", "tour")
# Contratos antigos continuam obrigatórios. CSS novo é descoberto automaticamente.
CSS_REQUIRED = (
    "source/html/ABA6/viewport-theme.css",
    "source/html/ABA5/viewport-theme.css",
    "source/html/ABA8/tour-frame.css",
    "source/html/ABA2/cad-hud.css",
    "source/html/ABA4/tour-layout.css",
    "source/html/ABA3/tour-layout.css",
    "source/html/ABA5/tour-layout.css",
    "source/html/ABA8/tour-controls-hidden.css",
    "source/html/ABA6/tour-layout.css",
    "source/html/ABA1/presentation.css",
    "source/html/ABA8/tour-pax.css",
    "source/html/ABA6/fullscreen.css",
    "source/html/ABA8/tour-buttons.css",
    "source/css/recording-and-transitions.css",
    "source/html/ABA7/closing-frame.css",
    "source/html/ABA8/tour-closing.css",
    "source/html/ABA7/closing-scenes.css",
    "source/html/ABA3/presentation.css",
    "source/html/ABA7/closing-illustrations.css",
)


def normalized(text: str) -> str:
    return re.sub(r"\s+", "", re.sub(r"/\*.*?\*/", "", text, flags=re.S))


class Checker:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.cache: dict[str, str | None] = {}
        self.label = "Geral"
        self._css_loaded = False
        self._css: str | None = None

    def check(self, ok: bool, message: str) -> None:
        if not ok:
            self.errors.append(f"[{self.label}] {message}")

    def read(self, path: str) -> str | None:
        if path not in self.cache:
            try:
                self.cache[path] = (ROOT / path).read_text(encoding="utf-8")
            except (OSError, UnicodeError) as exc:
                self.cache[path] = None
                self.check(False, f"Arquivo ausente/ilegível: {path} ({type(exc).__name__}: {exc})")
        return self.cache[path]

    def css(self) -> str | None:
        if not self._css_loaded:
            self._css_loaded = True
            html = self.read("FINALPROJECT_APHA.html")
            if html is not None:
                block = re.search(r"<style>(.*?)</style>", html, re.S)
                self.check(block is not None, "Bloco <style> principal ausente")
                if block is not None:
                    self._css = block.group(1)
        return self._css

    def has_css(self, source: str, fragment: str) -> bool:
        return normalized(fragment) in normalized(source)

    def order(self, source: str, markers: tuple[str, ...], message: str) -> None:
        positions = [source.find(marker) for marker in markers]
        self.check(all(n >= 0 for n in positions) and
                   all(a < b for a, b in zip(positions, positions[1:])), message)


def verify_tabs(v: Checker) -> None:
    html = v.read("FINALPROJECT_APHA.html")
    template = v.read("source/page.template.html")
    if html is None or template is None:
        return
    for index, tab in enumerate(TABS, 1):
        v.check(html.count(f'id="tab-btn-{tab}"') == 1, f"Aba {index}: botão ausente/duplicado")
        v.check(html.count(f'id="module-{tab}"') == 1, f"Aba {index}: módulo ausente/duplicado")
        path = f"source/html/ABA{index}/ABA{index}.html"
        fragment = v.read(path)
        if fragment is not None:
            v.check(f'id="module-{tab}"' in fragment, f"Aba {index}: módulo ausente do fonte")
        v.check(f"@@APHA_INCLUDE:{path}@@" in template, f"Aba {index}: inclusão ausente")
    v.check('<header class="bg-cad-panel/95' in template, "Cabeçalho global ausente")


def verify_engine(v: Checker) -> None:
    """Verifica o motor CAD monolítico e a ordem das dependências externas."""
    template = v.read("source/page.template.html")
    engine = v.read("source/js/engine/cabin-shared.js")
    navigation = v.read("source/js/core/navigation.js")
    # O motor agora reside em um único arquivo; não aceitar fontes duplicadas.
    removed = (
        "canvas-palette.js", "cabin-geometry.js", "bin-profiles.js",
        "dummy-rendering.js", "bin-kinematics.js", "cad-rendering.js",
        "seated-cabin.js",
    )
    engine_files = sorted(path.name for path in (ROOT / "source/js/engine").glob("*.js"))
    v.check(engine_files == ["cabin-shared.js"],
            f"Motor precisa de um único arquivo JS, encontrados: {engine_files}")
    if template is not None:
        v.check(template.count("@@APHA_INCLUDE:source/js/engine/cabin-shared.js@@") == 1,
                "Motor compartilhado ausente/duplicado no template")
        for legacy in (*removed, "cad2d-and-shared.js", "sectioncabin.js"):
            v.check(f"@@APHA_INCLUDE:source/js/engine/{legacy}@@" not in template,
                    f"Referência ao motor removido: {legacy}")
    if engine is not None:
        for legacy in removed:
            v.check(f"@@APHA_INCLUDE:source/js/engine/{legacy}@@" not in engine,
                    f"Include interno obsoleto: {legacy}")
        marks = (
            "@@APHA_INCLUDE:source/js/core/navigation.js@@",
            "@@APHA_INCLUDE:source/html/ABA6/controller.js@@",
            "function computeAllGeometries(",
            "function drawRealisticSuitcase(",
            "function drawDummyFrontFigure(",
            "function drawReferenceBins(",
            "function drawCADCanvas(",
            "@@APHA_INCLUDE:source/html/ABA6/manikin.js@@",
            "window.drawSeatedScene = drawSeatedScene;",
        )
        for marker in marks:
            v.check(engine.count(marker) == 1,
                    f"Componente do motor ausente/duplicado: {marker}")
        v.order(engine, marks, "Ordem da geometria, CAD e manikin alterada")
        v.check("function switchTab(tab) {" not in engine,
                "Navegação duplicada dentro do motor CAD")
        v.check("window.SEATED_STAT =" in engine, "Estado SEATED_STAT ausente")

        # A ordenacao por blocos organiza a leitura sem mover instrucoes,
        # escopos nem as inclusoes de navigation/controller/manikin.
        headers = tuple(f"// BLOCO {n:02d}/08 -" for n in range(1, 9))
        for marker in headers:
            v.check(engine.count(marker) == 1,
                    f"Bloco de documentacao ausente/duplicado: {marker}")
        ordered_sections = (
            headers[0], "(function installDarkPalette() {",
            headers[1], "@@APHA_INCLUDE:source/js/core/navigation.js@@",
            "function computeAllGeometries(",
            headers[2], "function drawRealisticSuitcase(",
            headers[3], "const DUMMY_PALETTES = {",
            headers[4], "const CABIN_R = APHA_CABIN_GEOMETRY.fuselageRadiusCm;",
            headers[5], "function drawCADCanvas(",
            headers[6], "@@APHA_INCLUDE:source/html/ABA6/manikin.js@@",
            headers[7], "function drawSeatedScene(",
        )
        v.order(engine, ordered_sections,
                "Indice dos oito blocos nao corresponde a ordem real de execucao")
        for subsection in ("02.1", "02.2", "03.1",
                           "04.1", "05.1", "05.2", "05.3", "05.4", "05.5",
                           "08.1"):
            v.check(engine.count(f"// SUBBLOCO {subsection} -") == 1,
                    f"Subbloco de documentacao ausente/duplicado: {subsection}")

    if navigation is not None:
        v.check(navigation.count("function switchTab(tab) {") == 1,
                "switchTab ausente/duplicada na navegação")

def verify_css(v: Checker) -> None:
    template = v.read("source/page.template.html")
    manifest = v.read("source/css/global.css")
    if template is not None:
        v.check(template.count("@@APHA_INCLUDE:source/css/global.css@@") == 1,
                "Inclusão principal do CSS ausente/duplicada")
    if manifest is None:
        return
    refs = re.findall(r"@@APHA_INCLUDE:([^@]+\.css)@@", manifest)
    counts = Counter(refs)
    for path in CSS_REQUIRED:
        v.check(counts[path] == 1, f"Estilo histórico ausente/duplicado: {path}")
    for path, amount in counts.items():
        v.check(amount == 1, f"Include CSS duplicado ({amount}): {path}")
    def descend(path: str, parents: tuple[str, ...]) -> None:
        if path in parents:
            v.check(False, f"Ciclo de includes CSS: {' -> '.join((*parents, path))}")
            return
        data = v.read(path)
        if data is None:
            return
        children = re.findall(r"@@APHA_INCLUDE:([^@]+\.css)@@", data)
        for child, amount in Counter(children).items():
            v.check(amount == 1, f"Include CSS duplicado em {path}: {child}")
        for child in set(children):
            descend(child, (*parents, path))
    for path in set(refs):
        descend(path, ("source/css/global.css",))
    v.check("body {" in manifest and "html, body {" in manifest, "Tema global ausente")
    v.check("source/html/ABA1/styles.css" not in manifest, "CSS isolado PAX no manifesto global")
    v.check("source/css/shared-viewport.css" not in manifest, "Include CSS obsoleto")
    # CSS é a fonte única de cores. O motor Canvas lê esses tokens após o CSS
    # ser processado, e o Tailwind CDN mantém seu adaptador JavaScript isolado.
    config = v.read("source/js/core/config.js")
    tailwind_theme = v.read("source/js/core/tailwind-theme.js")
    if template is not None:
        v.order(template, (
            "<style>@@APHA_INCLUDE:source/css/global.css@@</style>",
            "<script>@@APHA_INCLUDE:source/js/core/config.js@@</script>",
        ), "CSS deve ser carregado antes do adaptador Canvas/Tailwind")
    for color in ("bg","panel","border","cyan","mid","neutral","muted","text","dark-outline","bin-outline","bin-cavity","shell-fill","shell-outline","floor-fill","floor-outline","grid","mid-45"):
        v.check(f"--apha-{color}:" in manifest,
                f"Variável de cor CSS ausente: --apha-{color}")
    if config is not None:
        v.check("getComputedStyle(document.documentElement)" in config,
                "Canvas não lê a paleta a partir do CSS")
        v.check("document.documentElement.style.setProperty" not in config,
                "JavaScript voltou a sobrescrever as variáveis do CSS")
        v.check(config.count("@@APHA_INCLUDE:source/js/core/tailwind-theme.js@@") == 1,
                "Adaptador Tailwind ausente ou duplicado")
        v.check("tailwind.config =" not in config,
                "Configuração visual Tailwind ainda misturada aos cálculos")
    if tailwind_theme is not None:
        v.check("tailwind.config =" in tailwind_theme,
                "Configuração Tailwind ausente do arquivo visual")
        v.check("APHA_CABIN_PALETTE" in tailwind_theme,
                "Tailwind não utiliza a paleta compartilhada")

    css = v.css()
    if css is not None:
        v.check("#aba6-module-ergo > .bg-cad-panel:first-child" not in css,
                "Cabeçalho da Aba 6 ocultado por regra antiga")
        v.check(not v.has_css(css, "#aba6-module-ergo, #module-unified {row-gap:0 !important;}"),
                "Regra row-gap obsoleta reintroduzida")


def verify_blueprint(v: Checker) -> None:
    manifest = v.read("source/css/global.css")
    theme5 = v.read("source/html/ABA5/viewport-theme.css")
    theme6 = v.read("source/html/ABA6/viewport-theme.css")
    sim5 = v.read("source/html/ABA5/unified-simulation.js")
    manikin = v.read("source/html/ABA6/manikin.js")
    engine = v.read("source/js/engine/cabin-shared.js")
    frame = v.read("source/html/ABA8/tour-frame.css")
    tour5 = v.read("source/html/ABA5/tour-layout.css")
    if manifest is not None:
        v.check(v.has_css(manifest, ".sim-bg{background-color:var(--apha-bg);background-image:"),
                "Malha blueprint CSS removida")
        v.check(v.has_css(manifest, "background-size:48px 48px"), "Grade 48px alterada")
    if theme5 is not None:
        v.check(not v.has_css(theme5, "#module-unified .sim-bg{background:var(--apha-bg)}"),
                "Aba 5 voltou a usar fundo liso")
        v.check(v.has_css(theme5,
                "#module-unified > .bg-cad-panel:first-of-type { display:none !important; }"),
                "Regra exclusiva do título antigo da Aba 5 ausente")
    if theme6 is not None:
        v.check(not v.has_css(theme6, "#aba6-module-ergo .sim-bg{background:var(--apha-bg)}"),
                "Aba 6 voltou ao fundo liso")
        v.check(not v.has_css(theme6, "#aba6-module-ergo .sim-card > div:first-child{background:"),
                "Aba 6 voltou a cobrir a malha com fundo opaco")
    if sim5 is not None:
        v.check(re.search(r"cssGridBackdrop\s*:\s*!inTourView\(\)", sim5) is not None,
                "Canvas da Aba 5 deixou de ser transparente")
        v.check(re.search(r"drawUnifiedCabinBackground\s*\(\s*ctx\s*,\s*m\.W\s*,\s*m\.H", sim5) is None,
                "Aba 5 desenha malha física duplicada")
    if manikin is not None:
        v.check("ctx.canvas.id !== 'aba6-manikinCanvas'" in manikin,
                "Aba 6 desenha malha dupla")
        v.check(re.search(r"tour\s*:\s*!!canvas\.closest\('#tour-stage'\)\s*,\s*paint\s*:\s*false", manikin) is not None,
                "Aba 6 pinta fundo opaco")
    if engine is not None:
        v.check(re.search(r"paint\s*:\s*!opts\.cssGridBackdrop", engine) is not None,
                "Motor CAD sobrepõe a malha CSS")
    if frame is not None:
        v.check(v.has_css(frame, "#tour-stage .sim-bg{background:none}"),
                "Simulação Geral perdeu malha fixa")
    if tour5 is not None:
        v.check("#tour-stage #module-unified .sim-bg" in tour5,
                "Simulação Geral perdeu layout da Aba 5")



def verify_bin_kinematics(v: Checker) -> None:
    """Contratos de geometria entre as Abas 5, 6 e 8 e caches conservadores."""
    kinetics = v.read("source/js/engine/cabin-shared.js")
    config = v.read("source/js/core/config.js")
    if config is not None:
        v.check("fuselageRadiusCm: 137.16" in config and
                "fuselageCenterYCm: 62.84" in config,
                "Dimensões físicas de referência da cabine foram alteradas")

    aba5 = v.read("source/html/ABA5/unified-simulation.js")
    door = v.read("source/html/ABA5/door-addon.js")
    aba5_html = v.read("source/html/ABA5/ABA5.html")
    aba6 = v.read("source/html/ABA6/manikin.js")
    aba8 = v.read("source/html/ABA8/director-and-recording.js")
    cad_render = kinetics  # Renderizador e cinemática estão no mesmo arquivo.
    if kinetics is not None:
        for name in ("getUniAlphaGeometry", "getUniBinUndersideY",
                     "drawUniReferenceBins"):
            v.check(f"window.{name} =" in kinetics,
                    f"Exportação pública da cinemática ausente: {name}")
        # Usar as medidas do CAD efetivamente desenhado: o antigo modelo
        # de porta a 39° foi eliminado por não controlar a porta de 82°.
        for dead in ("computeLeftBinAtY(", "cachedClosedConventional",
                     "CONVENTIONAL_DOOR_OPEN_DEG", "DOOR_KINEMATIC_DELTA",
                     "vectorBinUnderY(", "BIN_VEC_POLY", "NULLCTX"):
            v.check(dead not in kinetics,
                    f"Código legado sem consumidor reapareceu: {dead}")
        v.check("const CONV_CAD_BASE_Y_CM = 138.50;" in kinetics and
                "const CONV_CAD_TIP_Y_CM = 153.04;" in kinetics and
                "const highConv = CONV_CAD_TIP_Y_CM" in kinetics,
                "Cotas convencionais deixaram de usar o CAD visível")
        v.check("const ALPHA_CAD_FLOOR_TARGET_Y_CM = 148.70;" in kinetics,
                "Alvo de altura Alpha duplicado/ausente")
        v.check("cachedAlphaTheta" in kinetics and
                "cachedAlphaGeometry" in kinetics and
                "alphaUndersideForTheta(alpha.thetaDeg)" in kinetics,
                "Cache geométrico ALPHA incompleto")
        v.check(kinetics.count("uni-height-") == 6 and
                "function updateHeightReadouts(" in kinetics,
                "Seis indicadores de altura ou atualização do DOM ausentes")
        v.check("const convBottom =" not in kinetics,
                "Amostragem quadrática convencional sem consumidor reapareceu")
        v.check(all(dead not in kinetics for dead in
                    ("function traceVectorBin(", "function traceBinAlphaProfile(",
                     "function traceEmbraerBinProfile(", "const BIN_VEC = {")),
                "Modelo de bin alternativo reapareceu no motor")

        # As duas geometrias CAD finais partem dos mesmos dados físicos
        # usados na cabine; a porta visível conserva o último limite de 82°.
        v.check("const CABIN_R = APHA_CABIN_GEOMETRY.fuselageRadiusCm;" in kinetics,
                "Raio do CAD exato deixou de seguir core/config.js")
        v.check("const CABIN_YC = APHA_CABIN_GEOMETRY.fuselageCenterYCm;" in kinetics,
                "Centro do CAD exato deixou de seguir core/config.js")
        v.check("const R = CABIN_R, CY = CABIN_YC" in kinetics,
                "Bin convencional visível usa outra referência da fuselagem")
        v.check("const visibleDoorMaxDeg = 82;" in kinetics and
                "const angle = u * visibleDoorMaxDeg;" in kinetics,
                "Abertura de 82 graus do desenho convencional foi modificada")
        v.check("if (opts.referenceBins) { ctx.save(); ctx.globalAlpha = 0; }" not in kinetics,
                "Perfis antigos estão sendo desenhados de maneira invisível")
        v.check("const alphaRefOuterX = g.x_livre + 88.90 * scaleFactor;" in kinetics and
                "window.drawUniReferenceBins(ctx, W, H" in kinetics,
                "Cotas históricas ou desenho do CAD exato ausentes")
        v.check("cachedAlphaFloor" in kinetics,
                "Apoio CAD do ALPHA voltou a ser transformado a cada consulta")

        for flag in ("__uniRefDoorProgress", "__aphaAlphaBodyOpacity",
                     "__aphaTambourOrange", "cabinSectionReference"):
            v.check(flag in kinetics, f"Dependência de runtime ausente: {flag}")
    if aba5 is not None:
        v.check("window.cabinSectionReference =" in aba5,
                "Aba 5 não disponibiliza o mapa da cabine compartilhado")
        v.check("window.__uniRefDoorProgress" in aba5,
                "Aba 5 não sincroniza o progresso da porta")
        v.check("__aphaTambourOrange" in aba5,
                "Aba 5 não respeita a exceção laranja da porta")
    if door is not None:
        v.check("window.__uniRefDoorProgress =" in door,
                "Controle de porta da Aba 5 não inicializa seu estado")
    if aba6 is not None:
        for name in ("getUniAlphaGeometry", "drawUniReferenceBins",
                     "cabinSectionReference"):
            v.check(name in aba6,
                    f"Aba 6 perdeu dependência do motor CAD: {name}")
    if aba8 is not None:
        v.check("__aphaAlphaBodyOpacity" in aba8,
                "Aba 8 não ajusta a opacidade do corpo ALPHA")
    if cad_render is not None:
        v.check("window.drawUniReferenceBins" in cad_render,
                "Renderizador principal não chama o CAD compartilhado")
    if aba5_html is not None:
        for name in ("conv-high", "alpha-high", "delta-high",
                     "conv-low", "alpha-low", "delta-low"):
            v.check(aba5_html.count(f'id="uni-height-{name}"') == 1,
                    f"Indicador de altura ausente/duplicado: {name}")

def verify_aba6_layout(v: Checker) -> None:
    html6 = v.read("source/html/ABA6/ABA6.html")
    standalone = v.read("source/html/ABA6/fullscreen.css")
    tour = v.read("source/html/ABA6/tour-layout.css")
    css = v.css()
    if html6 is not None:
        v.check(html6.count('id="aba6-header"') == 1,
                "Título no HTML-fonte da Aba 6 ausente/duplicado")
        v.check("Biomechanical Validation &amp; Boarding Time" in html6,
                "Título biomecânico alterado")
        v.check('class="aba6-sim-card sim-card bg-cad-panel border border-cad-border rounded-xl overflow-hidden"' in html6,
                "Moldura do canvas biomecânico removida")
    if standalone is not None:
        for rule, name in (
            ("--aba6-header-height:58px", "Altura do título"),
            ("height:clamp(480px, 70vh, 740px)", "Altura do viewport"),
            ("margin-top:14px !important;", "Margem do cartão"),
            ("border:1px solid var(--apha-mid-45)", "Borda do cartão"),
            ("border-radius:12px;", "Cantos arredondados"),
            ("#tour-stage #aba6-module-ergo .sim-card {height:100% !important;margin-top:0 !important;overflow:visible !important;}", "Enquadramento do tour"),
        ):
            v.check(v.has_css(standalone, rule), f"Aba 6: {name} alterado")
        for obsolete in ("body.apha-simulation-view > header",
                         "body.apha-simulation-view > main",
                         "body.apha-simulation-view #apha-return-tabs"):
            v.check(obsolete not in standalone, f"Regra fullscreen antiga: {obsolete}")
    if tour is not None:
        v.check(v.has_css(tour, "#tour-stage #aba6-header{display:none !important;}"),
                "Título da Aba 6 aparece no tour")
        v.check(v.has_css(tour,
                "#tour-stage #aba6-module-ergo .sim-card{border:0;border-radius:0;box-shadow:none;background:transparent}"),
                "Moldura biomecânica aparece no take")
    if css is not None:
        rule = "#module-unified > .bg-cad-panel:first-of-type { display:none !important; }"
        v.check(normalized(css).count(normalized(rule)) == 1,
                "Regra do título da Aba 5 ausente/duplicada no CSS final")
    html = v.read("FINALPROJECT_APHA.html")
    if html is not None:
        v.check(html.count('id="aba6-header"') == 1,
                "Cabeçalho da Aba 6 ausente/duplicado no HTML final")
        v.check(html.count('id="aba6-manikinCanvas"') == 1,
                "Canvas biomecânico ausente/duplicado no HTML final")


def verify_recording_css(v: Checker) -> None:
    shared = v.read("source/css/recording-and-transitions.css")
    css2 = v.read("source/html/ABA2/recording-layout.css")
    css3 = v.read("source/html/ABA3/recording-layout.css")
    css6 = v.read("source/html/ABA6/recording-layout.css")
    if shared is None:
        return
    marks = tuple(f"@@APHA_INCLUDE:source/html/ABA{i}/recording-layout.css@@"
                  for i in (2, 3, 6))
    for mark in marks:
        v.check(shared.count(mark) == 1, f"Include de gravação ausente/duplicado: {mark}")
    v.order(shared, marks, "Ordem das regras de gravação alterada")
    for rule in ("#tour-stage.rec #cad3d-container",
                 "#tour-stage.rec > #module-nova",
                 "#tour-stage.rec #aba6-module-ergo"):
        v.check(rule not in shared, f"CSS exclusivo de aba no arquivo compartilhado: {rule}")
    if css2 is not None:
        v.check(v.has_css(css2, "#tour-stage.rec #cad3d-container{height:100% !important;}"),
                "Altura do CAD na gravação alterada")
    if css3 is not None:
        v.check(v.has_css(css3, "#tour-stage.rec > #module-nova{"),
                "Quadro dos bins na gravação ausente")
        v.check(v.has_css(css3, "top:2.2%"),
                "Margem de 2,2% alterada")
    if css6 is not None:
        v.check("#tour-stage.rec #aba6-module-ergo" in css6,
                "Altura da Aba 6 na gravação ausente")


def verify_aba1_assets(v: Checker) -> None:
    pax = v.read("source/html/ABA1/index.template.html")
    template = v.read("source/page.template.html")
    if pax is not None:
        for name in ("aircraft.js", "passengers.js", "controls.js"):
            v.check(f"@@APHA_INCLUDE:source/html/ABA1/js/{name}@@" in pax,
                    f"Script do iframe PAX ausente: {name}")
        for name in ("illustration-01.svg", "illustration-02.svg"):
            v.check(f"@@APHA_INCLUDE:source/html/ABA1/svg/{name}@@" in pax,
                    f"Ilustração do iframe PAX ausente: {name}")
        v.check("@@APHA_INCLUDE:source/html/ABA1/styles.css@@" in pax,
                "CSS isolado do iframe PAX ausente")
    if template is not None:
        v.check("@@APHA_PAX:source/html/ABA1/index.template.html@@" in template,
                "Inclusão do iframe PAX ausente")


def verify_aba1_passengers(v: Checker) -> None:
    code = v.read("source/html/ABA1/js/passengers.js")
    if code is None:
        return


    def require(test: bool, message: str) -> None:
        v.check(test, message)


    def once(needle: str) -> None:
        require(code.count(needle) == 1, "missing or duplicate: " + needle)


    for name, rig in (
        ("createTraveler", "rig1"),
        ("createElder", "rig2"),
        ("createMother", "rig3"),
    ):
        once("function " + name + "(")
        once("const " + rig + " = " + name + "()")
        once("stylizeCartoon(" + rig + ".root, " + rig + ".fadeU)")

    once("window.PAX =")
    once("function paxRoundedRect(")
    once("function paxCaseSlab(")
    once("function addAdultEars(")
    once("function addAdultNose(")
    once("function updateWalk()")

    require(
        "addAdultNose(head, skinM, 0.0125, 0.0118, 0.0082, 0.0112)" in code,
        "elder's nose proportions changed",
    )
    require(
        "addAdultNose(head, skinM, 0.0115, 0.0108, 0.0074, 0.0102)" in code,
        "mother's nose proportions changed",
    )
    require(
        "const blue = tag(swaddleBlueMat, 'blanket'); blue.side = THREE.DoubleSide;" in code,
        "baby blanket lit class or material sides changed",
    )
    require(
        "const SUIT_C = '#bfa58e'" in code and "suit: '#b99b7c'" in code,
        "distinct original suit colors were collapsed",
    )
    require(
        "'inkOutline' + mul + 'R' + (fadeU ? 'F' : '')" in code,
        "outline shader cache key changed",
    )
    require(
        "'flatRich' + (old.userData && old.userData.lit) + (fadeU ? 'F' : '')" in code,
        "material shader cache key changed",
    )
    require(
        r"'#include <common>\nattribute vec3 aOutN;\nuniform float uOutlineW;\nuniform vec3 uLightO;'" in code,
        "shader GLSL newlines changed",
    )

    obsolete = ("shirt", "sleeve", "thigh", "calf", "face", "hair",
                "swaddle", "swaddleBlue", "earM", "pelvis", "hairM")
    for key in obsolete:
        require(re.search(r"\bPT\." + re.escape(key) + r"\b", code) is None,
                "old PT texture is referenced: " + key)

    for key in set(re.findall(r"\bPT\.([A-Za-z_]\w*)", code)):
        require(re.search(r"\b" + re.escape(key) + r":\s*", code) is not None,
                "undefined PT texture recipe: " + key)

    for removed in ("flatMaterial(", "OUTLINE_COLOR", "if (rich)", "updateWalk(0)"):
        require(removed not in code, "obsolete rendering branch reintroduced: " + removed)



def verify_aba3(v: Checker) -> None:
    cad = v.read("source/html/ABA2/cad3d.js")
    render = v.read("source/html/ABA3/bin-comparison-renderers.js")
    include = "@@APHA_INCLUDE:source/html/ABA3/bin-comparison-renderers.js@@"
    if cad is not None:
        v.check(cad.count(include) == 1, "Inclusão dos renderers da Aba 3 ausente/duplicada")
        v.order(cad, (include, "window.cad3dExportImages"),
                "Ordem do renderer/exportador da Aba 3 alterada")
    if render is not None:
        for required in (
            "function drawTopDimension(", "(function novaFront() {",
            "(function conventionalSVGTopView(){", "window.novaEnter =",
            "window.__novaRender =", "window.__convDraw=draw;",
            "window.__convCapture=", "window.novaShowHeader=",
        ):
            v.check(required in render, f"Função da comparação ausente: {required}")


def verify_aba4(v: Checker) -> None:
    animation = v.read("source/html/ABA4/animation.js")
    if animation is None:
        return
    for name in ("aircraft.svg.base64", "detail-s.svg.base64"):
        path = f"source/html/ABA4/{name}"
        v.read(path)
        v.check(animation.count(f"@@APHA_INCLUDE:{path}@@") == 1,
                f"SVG da Aba 4 ausente/duplicado: {name}")
    v.check("source/assets/topview/" not in animation,
            "Caminho antigo dos SVG da Aba 4 reapareceu")


def verify_aba6_controller(v: Checker) -> None:
    controller = v.read("source/html/ABA6/controller.js")
    cabin = v.read("source/js/engine/cabin-shared.js")
    director = v.read("source/html/ABA8/director-and-recording.js")
    if cabin is not None:
        inc = "@@APHA_INCLUDE:source/html/ABA6/controller.js@@"
        v.check(cabin.count(inc) == 1, "Inclusão do controlador biomecânico ausente/duplicada")
        v.order(cabin, (inc, "function computeAllGeometries("),
                "Controlador biomecânico fora da ordem do motor")
    if controller is not None:
        for name in ("initAba6Engine", "scheduleAba6Engine", "pauseAba6Engine"):
            v.check(f"function {name}(" in controller, f"Função biomecânica ausente: {name}")
            if cabin is not None:
                v.check(f"function {name}(" not in cabin,
                        f"Função biomecânica duplicada no motor: {name}")
    if director is not None:
        v.check("scheduleAba6Engine({tour:true,reset:true" in director,
                "Simulação Geral não inicia Aba 6")
        v.check("pauseAba6Engine()" in director, "Simulação Geral não pausa Aba 6")


def verify_aba7(v: Checker) -> None:
    closing = v.read("source/html/ABA7/ABA7.html")
    if closing is None:
        return
    for n in ("01", "02", "04", "06", "08", "10", "13"):
        v.check(f"@@APHA_INCLUDE:source/html/ABA7/svg/illustration-{n}.svg@@" in closing,
                f"SVG da conclusão ausente: {n}")


def verify_takes(v: Checker) -> None:
    director = v.read("source/html/ABA8/director-and-recording.js")
    html = v.read("FINALPROJECT_APHA.html")
    css = v.css()
    if director is not None:
        manifest = re.search(r"const TOUR_TAKES = \[([\s\S]*?)\];", director)
        v.check(manifest is not None, "Manifesto TOUR_TAKES ausente")
        if manifest is not None:
            takes = [(int(a), int(b), mode, name) for a, b, mode, name in re.findall(
                r"\{\s*start:(\d+),end:(\d+),mode:'([^']+)',name:'([^']+)'\s*\}",
                manifest.group(1))]
            v.check(takes == [
                (0, 0, "full", "01-aviao"),
                (1, 3, "full", "02-cad-bins-vista-superior"),
                (4, 5, "full", "03-secao-manikin"),
                (6, 6, "closing", "04-conclusao-sem-logo"),
                (6, 6, "logo", "05-logo"),
            ], f"Agrupamento dos cinco takes alterado: {takes}")
        v.check(re.search(r"const\s+OW\s*=\s*1920\s*,\s*OH\s*=\s*1080", director) is not None,
                "Resolução de gravação Full HD alterada")
    if css is not None:
        v.check(v.has_css(css, "#scene-1 #s1-stage{width:1920px;height:1080px"),
                "Enquadramento do encerramento 1 alterado")
        v.check(v.has_css(css,
                "#scene-2 #s2-stage{position:absolute;left:0;top:0;width:1920px;height:1080px"),
                "Enquadramento do encerramento 2 alterado")
    if html is not None:
        for marker in ("window.cad3dTourMorph", "fitBagDimensionLabels",
                       "async function fxNovaIn", "async function fxCabinToStow",
                       "function measureNovaCol", "function startCrossfade"):
            v.check(marker in html, f"Handler de transição/cotas ausente: {marker}")
        v.check(len(re.findall(r"<script\b", html)) == 12,
                "Número de blocos script do HTML final alterado")


def main() -> int:
    v = Checker()
    groups = (
        ("Abas e fontes", verify_tabs),
        ("Motor e navegação", verify_engine),
        ("CSS e módulos", verify_css),
        ("Abas 5/6: malha", verify_blueprint),
        ("Aba 5: cinemática CAD", verify_bin_kinematics),
        ("Aba 6: layout", verify_aba6_layout),
        ("CSS de gravação", verify_recording_css),
        ("Aba 1: recursos", verify_aba1_assets),
        ("Aba 1: passageiros", verify_aba1_passengers),
        ("Aba 3: comparação", verify_aba3),
        ("Aba 4: SVG", verify_aba4),
        ("Aba 6: controlador", verify_aba6_controller),
        ("Aba 7: conclusão", verify_aba7),
        ("Aba 8: takes", verify_takes),
    )
    for section, verify in groups:
        v.label = section
        try:
            verify(v)
        except Exception as exc:
            v.check(False, f"Erro inesperado: {type(exc).__name__}: {exc}")
    if v.errors:
        print(f"FALHA: {len(v.errors)} problema(s):", file=sys.stderr)
        for message in v.errors:
            print(" - " + message, file=sys.stderr)
        return 1
    print(f"OK: {len(groups)} grupos; oito abas, CSS, passageiros, "
          "transições e cinco takes Full HD preservados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
