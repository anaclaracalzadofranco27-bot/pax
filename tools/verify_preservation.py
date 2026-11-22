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
            headers[3], "const DUMMY_PALETTE = {",
            headers[4], "const CABIN_R = APHA_CABIN_GEOMETRY.fuselageRadiusCm;",
            headers[5], "function drawCADCanvas(",
            headers[6], "@@APHA_INCLUDE:source/html/ABA6/manikin.js@@",
            headers[7], "function drawSeatedScene(",
        )
        v.order(engine, ordered_sections,
                "Indice dos oito blocos nao corresponde a ordem real de execucao")
        for subsection in ("02.1", "02.2", "03.1",
                           "04.1", "05.1", "05.2", "05.3", "05.4",
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
        for helper in ("function mapAphaCabinSection(", "function aphaCabinShellPoint(",
                       "function aphaCabinShellEndAngle("):
            v.check(helper in config, "Primitiva geométrica compartilhada ausente: " + helper)
        v.check(config.count("shellThicknessCm: 5.5") == 1,
                "Espessura física da fuselagem duplicada ou alterada")

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
                "getConventionalCadGeometry()" in kinetics,
                "CAD convencional perdeu as referencias fisicas calibradas")
        v.check("const ALPHA_CAD_FLOOR_TARGET_Y_CM = 148.70;" in kinetics,
                "Alvo de altura Alpha duplicado/ausente")
        v.check("cachedAlphaTheta" in kinetics and
                "cachedAlphaGeometry" in kinetics and
                "alphaUndersideForTheta(computeRightAlphaLocked().thetaDeg)" in kinetics,
                "Cache geométrico ALPHA incompleto")
        v.check("function updateHeightReadouts(" not in kinetics and
                "uni-height-" not in kinetics and
                "uni-bin-height-compare" not in (v.read("source/html/ABA5/ABA5.html") or ""),
                "Telemetria de altura permanentemente oculta reapareceu")
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
        v.check("window.drawUniReferenceBins(ctx, W, H" in kinetics and
                "window.getUniBinUndersideY =" in kinetics and
                "function drawDimensionLine(" in kinetics,
                "CAD exato ou cotas de folga da cabeca ausentes")
        v.check("const cadDim =" not in kinetics and
                "if (!opts.noGrid)" not in kinetics and
                "return {" in kinetics,
                "Rotinas CAD desativadas voltaram ao motor")
        v.check("function alphaFloorHighY(thetaDeg)" in kinetics and
                "alphaExtremeYAtTheta(" not in kinetics and
                "const thetaDeg = solveAlphaTheta();" in kinetics,
                "Modos angulares obsoletos do Alpha reapareceram")
        v.check("const { toX, toY, scale } = opts.map(W, H);" in kinetics and
                "const xMin = -(g.R + 4);" not in kinetics,
                "Projecao CAD alternativa nao utilizada reapareceu")
        v.check("const K = 0.74;" in kinetics and
                "if (t >= 0.55)" not in kinetics and
                "o.ankleY" not in kinetics and "o.slim" not in kinetics,
                "Posturas alternativas sem chamadas reapareceram")
        v.check("const seatsOn =" not in kinetics and
                "return { clWinEmb" not in kinetics,
                "Retornos de folga sem consumidores reapareceram")
        v.check("const DUMMY_PALETTE = {" in kinetics and
                "const DUMMY_PALETTES =" not in kinetics and
                "seam: '#1e293b'" not in kinetics,
                "Seletor ou propriedade de paleta sem uso reapareceu")
        # As duas paletas escuras conservam regras e caches distintos,
        # mas usam uma unica interpolacao da rampa de luminancia.
        v.check("const mapLuminance = (L, a) => {" in kinetics and
                kinetics.count("out = mapLuminance(L, a);") == 2 and
                kinetics.count("for (let i = 1; i < RAMP.length; i++)") == 1 and
                "const cache = new Map();" in kinetics and
                "const dkCache = new Map();" in kinetics,
                "Interpolacao duplicada da paleta escura reapareceu")
        # O arco varia durante a abertura; apenas o estagio completo
        # reutiliza Path2D e invalida o cache quando viewport/mapa muda.
        v.check("outerR = R + APHA_CABIN_GEOMETRY.shellThicknessCm, N = 90;" in kinetics and
                "R_ext = g.R + APHA_CABIN_GEOMETRY.shellThicknessCm, N = 90" in kinetics and
                "pt(g.R + APHA_CABIN_GEOMETRY.shellThicknessCm / 2, th1)" in kinetics,
                "Arco superior voltou a duplicar espessura numérica do casco")
        v.check("let cachedCompletedFuselageArc = null;" in kinetics and
                "function getCompletedFuselageArc(g, toX, toY, W, H)" in kinetics and
                "if (p >= 1) {" in kinetics and
                "const paths = getCompletedFuselageArc(g, toX, toY, W, H);" in kinetics and
                "ctx.fill(paths.fill);" in kinetics and
                "ctx.stroke(paths.inner);" in kinetics and
                "ctx.stroke(paths.outer);" in kinetics and
                "const key = [W, H, R, toX(0), toY(0), toX(R), toY(R), toX(-R), toY(-R)].join('|');" in kinetics and
                "const [x, y] = pt(g.R + APHA_CABIN_GEOMETRY.shellThicknessCm / 2, th1);" in kinetics,
                "Cache do arco estatico ou revelacao animada da fuselagem ausente")
        v.check("function paintPath(ctx, path, fill, stroke, lw)" in kinetics and
                "evenodd ? 'evenodd'" not in kinetics,
                "Parametro de preenchimento sem consumidores reapareceu")
        v.check("cachedAlphaFloor" in kinetics,
                "Apoio CAD do ALPHA voltou a ser transformado a cada consulta")
        v.check("function drawAphaCabinFloor(" in config and
                "drawAphaCabinFloor(ctx, toX, toY, scale);" in aba5 and
                "drawAphaCabinFloor(ctx, toX, toY, scale, pf);" in aba5,
                "Piso completo e transição perderam a geometria compartilhada")
        v.check("function traceBinAlphaProfile(" not in kinetics and
                "function traceEmbraerBinProfile(" not in kinetics,
                "Modelos paralelos de bin reintroduzidos")
        v.check("let cachedAlphaCadPaths = null;" in kinetics and
                "function getAlphaCadPaths()" in kinetics and
                "const alphaPaths = getAlphaCadPaths();" in kinetics,
                "Caminhos estaticos do casco Alpha deixaram de ser cacheados")
        render = kinetics.split("function drawReferenceBins(", 1)[-1].split(
            "window.drawUniReferenceBins = drawReferenceBins;", 1)[0]
        v.check(render.count("new Path2D(") == 1 and
                "ctx.stroke(alphaPaths.track)" in render,
                "Renderizador voltou a construir paths estaticos por quadro")
        v.check("if (L.pax <= 0) return;" in kinetics,
                "Passageiros sentados invisiveis voltaram a ser desenhados")
        v.check("drawRealisticSuitcase(ctx, cx, cy, wPx, hPx, angleRad)" in kinetics and
                "colorOverride" not in kinetics,
                "Ramos antigos de mala foram reintroduzidos")
        v.check("const aphaClamp01 =" in config and
                "const aphaEaseCubic =" in config and
                "const cadEase =" not in kinetics,
                "Easing/clamp deixaram de usar as primitivas compartilhadas")
        v.check("function drawDimensionLine(ctx, x1, y1, x2, y2, label, fontSize" in kinetics,
                "Assinatura unificada das cotas foi alterada")

        for flag in ("__uniRefDoorProgress", "__aphaAlphaBodyOpacity",
                     "__aphaTambourOrange", "cabinSectionReference"):
            v.check(flag in kinetics, f"Dependência de runtime ausente: {flag}")
    if aba5 is not None:
        v.check("const m4 = mapAphaCabinSection;" in aba5 and
                "const aEnd = aphaCabinShellEndAngle(), N = 180;" in aba5 and
                "const aEnd = aphaCabinShellEndAngle();" in aba5 and
                "const N = 40;" in aba5 and
                "aphaCabinShellPoint(a, false, side)" in aba5 and
                "aphaCabinShellPoint(a, true, side)" in aba5,
                "Casco da Aba 5 não usa a mesma geometria da Aba 6")
        v.check("TL.total" not in aba5 and "U.t >= TOTAL - 0.05" in aba5,
                "Reinício da Aba 5 voltou a consultar TL.total inexistente")
        v.check("U.started" not in aba5 and "const act = phaseIdx();" not in aba5,
                "Estados mortos voltaram ao loop da Aba 5")
        for required in ("window.uniRefTimelineDoors", "window.uniRefUseTimelineDoors",
                         "window.uniRefDoorSnapshot", "window.uniRefDoorRestore",
                         "window.uniRefStopDoorMotion", "const previousPalette",
                         "window.uniExport4K = opts =>", "width: 1920, height: 1080, dpr: 2",
                         "finally {", "window.EXPORT_EN = prev.exportEn",
                         "window.BIN_SOLID = prev.solid", "window.BIN_DARK = prev.dark",
                         "U.customStature = statCm"):
            v.check(required in aba5, "Contrato de controle/exportação Aba 5 ausente: " + required)
        v.check(aba5.count("const playHTML =") == 1,
                "Botão Play voltou a recriar HTML sem mudança")
        v.check("const slider=document.getElementById('uni-bin-door-slider')" not in aba5,
                "Sincronização da UI da porta voltou a ser duplicada na timeline/export")
        v.check("window.cabinSectionReference =" in aba5,
                "Aba 5 não disponibiliza o mapa da cabine compartilhado")
        v.check("window.__uniRefDoorProgress" in aba5,
                "Aba 5 não sincroniza o progresso da porta")
        v.check("__aphaTambourOrange" in kinetics,
                "Motor compartilhado não respeita a exceção laranja da porta")
        v.check("const cubic=x=>" not in aba5 and
                "const cl = (x, a = 0" not in aba5 and
                "__uniSweepProgress" not in aba5,
                "Aba 5 voltou a definir helpers ou estados sem consumidor")
        v.check("referenceBins: true" not in aba5 and
                "noBags: true" not in aba5 and
                "minimalDims: true" not in aba5,
                "Flags CAD antigas reapareceram nas chamadas da Aba 5")
    if door is not None:
        v.check("window.__uniRefDoorProgress =" in door,
                "Controle de porta da Aba 5 não inicializa seu estado")
        for name in ("uniRefTimelineDoors", "uniRefUseTimelineDoors",
                     "uniRefStopDoorMotion", "uniRefDoorSnapshot", "uniRefDoorRestore",
                     "uniRefSetDoors", "uniRefToggleDoors"):
            v.check("window." + name + " =" in door,
                    "Contrato do controlador único das portas ausente: " + name)
    if aba6 is not None:
        for required in ("function cropManikinTransparentCanvas(", "function saveManikinPNG(",
                         "function exportAphaFigure(", "function exportManikinSteps(",
                         "const ERGO_FIXED = (() => {", "function ergoInterpCurveY(",
                         "const placePanelCamera = index =>", "ctx.reset()"):
            v.check(required in aba6, "Aba 6: função protegida ausente: " + required)
        for dead in ("PDFN_SIL_D", "function toggleManikinAnimation(",
                     "function cancelResultsSequence(", "function hideCards(",
                     "function writeCards(", "window.ergoManikinRect =",
                     "window.ergoTorqueSummary ="):
            v.check(dead not in aba6, "Aba 6: código morto retornou: " + dead)
        v.check(aba6.count("mapAphaCabinSection(W, H)") == 2 and
                "(H - 50) / 244" not in aba6,
                "Aba 6 voltou a duplicar a projeção geométrica")
        for name in ("getUniAlphaGeometry", "drawUniReferenceBins",
                     "cabinSectionReference"):
            v.check(name in aba6,
                    f"Aba 6 perdeu dependência do motor CAD: {name}")
        v.check("cachedErgoCADProfile" in aba6 and
                "return { ...cachedErgoCADProfile.profile };" in aba6,
                "Perfil ergonomico reutiliza estado mutavel sem isolamento")
        v.check("const cineEase = aphaEaseCubic;" in aba6 and
                "const ergoClamp01 = aphaClamp01;" in aba6,
                "Biomecanica voltou a duplicar easing e clamp")
    if aba8 is not None:
        v.check("__aphaAlphaBodyOpacity" in aba8,
                "Aba 8 não ajusta a opacidade do corpo ALPHA")
    if cad_render is not None:
        v.check("window.drawUniReferenceBins" in cad_render,
                "Renderizador principal não chama o CAD compartilhado")
    if aba5_html is not None:
        v.check('id="uni-bin-height-compare"' not in aba5_html and
                'id="uni-chips"' not in aba5_html and
                'uni-height-' not in aba5_html,
                "DOM oculto legado reapareceu na Aba 5")

def verify_aba6_layout(v: Checker) -> None:
    html6 = v.read("source/html/ABA6/ABA6.html")
    standalone = v.read("source/html/ABA6/fullscreen.css")
    theme = v.read("source/html/ABA6/viewport-theme.css")
    manikin = v.read("source/html/ABA6/manikin.js")
    tour = v.read("source/html/ABA6/tour-layout.css")
    css = v.css()
    if html6 is not None:
        v.check(html6.count('id="aba6-header"') == 1,
                "Título no HTML-fonte da Aba 6 ausente/duplicado")
        v.check("Biomechanical Validation &amp; Boarding Time" in html6,
                "Título biomecânico alterado")
        v.check('class="aba6-sim-card sim-card bg-cad-panel border border-cad-border rounded-xl overflow-hidden"' in html6,
                "Moldura do canvas biomecânico removida")
        v.check('id="aba6-figure-export"' in html6 and
                not re.search(r'<button[^>]*id="aba6-figure-export"[^>]*\bstyle=', html6),
                "O botão PNG da Aba 6 perdeu seu ID ou voltou a ter CSS inline")
    if theme is not None:
        v.check("#aba6-module-ergo .sim-card > div:first-child span" not in theme and
                "#aba6-module-ergo .sim-card > div:first-child div" not in theme,
                "Seletores órfãos para div/span retornaram ao viewport da Aba 6")
    if manikin is not None:
        for required in ("CAD Alpha compartilhada",
                         "Não existe slider de fase na interface atual.",
                         'O título renderizado é "5th Percentile Female", não P95.'):
            v.check(required in manikin, "Comentário da Aba 6 voltou a ficar desatualizado: " + required)
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
        for css_rule in (
            "#aba6-module-ergo {--aba6-header-height:58px;height:auto;}",
            "#aba6-module-ergo .aba6-sim-card {height:auto;}",
            "#tour-stage #aba6-module-ergo {height:100% !important;}",
            "#aba6-figure-export{",
            "position:absolute;right:16px;bottom:16px;z-index:5;",
            'font:600 11px "JetBrains Mono",monospace;cursor:pointer;',
        ):
            v.check(v.has_css(standalone, css_rule),
                    "CSS de altura ou do botão PNG ausente na Aba 6: " + css_rule)
        v.check("width:100%;height:100%;min-height:0;box-sizing:border-box;" not in standalone,
                "Card da Aba 6 voltou a somar 100% de altura abaixo do cabeçalho")
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
    if shared is None:
        return
    marks = tuple(f"@@APHA_INCLUDE:source/html/ABA{i}/recording-layout.css@@"
                  for i in (2, 3))
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
    # Seletor antigo .sm:h-[740px] nao corresponde a nenhuma classe atual.
    v.check(not (ROOT / "source/html/ABA6/recording-layout.css").exists(),
            "CSS obsoleto de gravacao da Aba 6 reapareceu")
    v.check("@@APHA_INCLUDE:source/html/ABA6/recording-layout.css@@" not in shared,
            "Include de gravacao obsoleto reapareceu")
    hud = v.read("source/html/ABA2/cad-hud.css")
    v.check("@keyframes cbIn{" in shared and
            (hud is None or "@keyframes cbIn{" not in hud),
            "Keyframe cbIn deixou de ser compartilhado")
    if hud is not None:
        v.check(
            "#tour-stage .cad3d-balloons.tour-sequenced.hud-off .hud-callout{animation-delay:0s}" in hud,
            "Saída do HUD pode herdar os atrasos de entrada do tour")
        for delay in ("--apha-title-delay", "--apha-legend-delay",
                      "--apha-measures-delay", "--apha-desc-delay"):
            v.check(delay in hud, "Atraso do HUD de entrada ausente: " + delay)
        v.check(
            ".alpha-hero-title-box,.alpha-hero-desc-box{" in hud
            and hud.count("box-shadow:0 8px 24px rgba(0,0,0,0.45)") == 1,
            "Acabamento compartilhado dos painéis HUD foi alterado")
        v.check(
            "width:min(48%,580px)" in hud and "max-width:580px" not in hud
            and "position:absolute;display:block;visibility:hidden" not in hud,
            "Regressão na limpeza das regras redundantes do HUD")


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
    controls = v.read("source/html/ABA1/js/controls.js")
    styles = v.read("source/html/ABA1/styles.css")
    if styles is not None:
        v.check("bag-detail" not in styles, "Aba 1: CSS da classe órfã bag-detail")
    if controls is not None:
        v.check("xray-bags" not in controls and "paxClockTime() >= TOTAL_TIME" in controls,
                "Aba 1: resíduo X-ray ou fim do tour dependente de intervalo de UI")
        v.check("const xrayLayers =" in controls and "xrayEls" not in controls and "const isBag =" not in controls,
                "Transição X-ray voltou a percorrer paths ou contém auxiliares mortos")


def verify_aba1_aircraft(v: Checker) -> None:
    """Uma cena SVG, linha do tempo, sobreposições e exportação no mesmo script."""
    manifest = v.read("source/html/ABA1/js/aircraft.js")
    if manifest is None:
        return
    prefix = "source/html/ABA1/js/aircraft/"
    names = ("01-aircraft-scene.js", "02-aircraft-playback.js",
             "03-aircraft-overlays-and-frames.js", "04-aircraft-video-export.js")
    expected = [f"@@APHA_INCLUDE:{prefix}{name}@@" for name in names]
    v.check(manifest.splitlines() == expected, "Manifesto de avião alterado ou fora de ordem")
    chunks = [v.read(prefix + name) for name in names]
    if any(chunk is None for chunk in chunks):
        return
    code = "\n".join(chunks)
    v.check("['#4a3147', '#5e4156', '#623f59']" not in code and "bag-detail" not in code,
            "Aba 1: classificador antigo de malas ou bag-detail foi reintroduzido")
    v.check("function paxClockTime(" in code and "time = paxClockTime()" in code
            and "playStart = performance.now() - time * 1000" in code,
            "Aba 1: o relógio precisa usar tempo absoluto (sem acumular passos fixos)")
    v.check(code.index("exportingVideo = true;") < code.index("await pickH264(")
            and "if (beganExport)" in code
            and "stream.getTracks().forEach(track => track.stop())" in code
            and "if (enc.state !== 'closed') enc.close()" in code,
            "Aba 1: regressão na exclusividade ou limpeza da exportação")
    for term in (
        "(function cadBlueprintPalette() {", "const rig = document.getElementById('camera-rig');",
        "const ZOOM_END = 10;", "const BIN_ON = ZOOM_END + 1.8;",
        "const TOTAL_TIME = 14;", "function updateStage(sec)",
        "const EXPORT_W = 1920, EXPORT_H = 1080, EXPORT_FPS = 30;",
        "const CAM_ZOOM = { s: 1.68, tx: -0.045, ty: -0.24, dur: 1.8 };",
        "function updateBalloonsLive(", "function drawExportFrame(",
        "function buildExportLayers(", "function encodeMp4(", "function recordRealtime(",
        "async function exportVideo(", "exportBtn.onclick = () => exportVideo();",
    ):
        v.check(term in code, "Contrato de avião/exportação ausente: " + term)


def verify_aba1_passengers(v: Checker) -> None:
    manifest = v.read("source/html/ABA1/js/passengers.js")
    if manifest is None:
        return
    # Os fragmentos compartilham um único escopo e são reunidos pelo build.py.
    # Validamos o código efetivamente montado, não apenas o manifesto.
    parts = ("01-scene-and-path.js", "02-textures-and-faces.js", "03-toon-rendering.js", "04-model-tools.js", "05-traveler.js", "06-elder.js", "07-mother-and-baby.js", "08-animation.js")
    prefix = "source/html/ABA1/js/passengers/"
    expected = [f"@@APHA_INCLUDE:{prefix}{name}@@" for name in parts]
    v.check(manifest.splitlines() == expected,
            "Manifesto de passageiros alterado: ordem ou includes ausentes")
    fragments = [v.read(prefix + name) for name in parts]
    if any(part is None for part in fragments):
        return
    code = "\n".join(fragments)


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

    for removed in ("flatMaterial(", "OUTLINE_COLOR", "if (rich)", "updateWalk(0)", "BLANKET_W"):
        require(removed not in code, "obsolete rendering branch reintroduced: " + removed)


    # Apenas os pivôs idênticos dos três personagens são compartilhados.
    for part in ("Pelvis", "Thorax", "Shoulder", "Elbow", "Hip", "Knee", "Ankle", "Foot"):
        once("function paxCreate" + part + "(")
        require(code.count("= paxCreate" + part + "(") == 3,
                "Pivô não compartilhado pelos três personagens: " + part)
    for requirement in (
        "upperArm: 10.2, forearm: 9.2, femur: 15.0, tibia: 14.0",
        "shoulder.rotation.order = 'YXZ'",
        "side * (6.2 * S) * 0.92, 13.0 * S, 0",
        "side * (3.6 * S) * 0.94, -1.2 * S, 0",
        "hasLastPose && lastPose.equals(q)",
        "items.every(it => !it.m.geometry.attributes.aOutN || it.O0)",
        "function requestPaxFrame()",
        "if (playing || now < paxZoomUntil) requestPaxFrame();",
        "document.addEventListener('visibilitychange'",
        "function setActive(active)",
        "function endExport()",
        "invalidate(); // restaura o quadro ao voltar da captura, inclusive em pausa",
    ):
        require(requirement in code, "Proteção anatômica/performance ausente: " + requirement)

def verify_aba2(v: Checker) -> None:
    """Aba 2: módulos CAD, exportadores e ordem compartilhada com a Aba 3."""
    manifest = v.read("source/html/ABA2/cad3d.js")
    if manifest is None:
        return
    prefix = "source/html/ABA2/cad3d/"
    parts = (
        "01-bin-geometry.js", "02-tambour-door-and-hud.js",
        "03-suitcase-model-and-dimensions.js", "04-placement-and-clearances.js",
        "05-camera-and-renderer.js", "06-simulation.js",
        "07-tour-transition.js", "08-controls.js",
        "09-export-common.js", "10-export-images.js", "11-export-side.js",
    )
    shared = "source/html/ABA3/bin-comparison-renderers.js"
    expected = [f"@@APHA_INCLUDE:{prefix}{n}@@" for n in parts[:8]]
    expected += [f"@@APHA_INCLUDE:{shared}@@"]
    expected += [f"@@APHA_INCLUDE:{prefix}{n}@@" for n in parts[8:]]
    v.check(manifest.splitlines() == expected, "Ordem das inclusões CAD alterada")
    fragments = [v.read(prefix + n) for n in parts]
    if any(fragment is None for fragment in fragments):
        return
    code = "\n".join(fragments)
    for key in (
        "const DIST=1157, TH=12;", "const DOOR_THICK = 5.0;",
        "const NUM_SLATS  = 24 * SLAT_SUB;", "const BAG_PATHS = [",
        "function sectionGap(", "function fitLowerBagToFloorAndRoof(",
        "function runSimulationFrame(", "window.cad3dTourMorph",
        "window.cad3dExportImages", "window.cad3dExportSideTransparent",
        "const CAD3D_EXPORT_W = 3840, CAD3D_EXPORT_H = 2160;",
        "function cad3dConfigureExport4K(", "function cad3dSnapshotExportState(",
        "function cad3dRestoreExportBags(", "function cad3dRestoreExportView(",
        "alpha_bin_3d_isometric_door_", "alpha_bin_side_wall_only_4k.png",
        "side_isometric_with_two_rear_bags",
    ):
        v.check(key in code, "Contrato CAD 3D ausente: " + key)
    for key in (
        "const near=", "const O=SUBS[0]", "const topWall", "LILAC_D",
        "plCol", "sideOp:", "views.front", "views.top",
        "[FLOOR_SEAT].forEach", "state.bagData",
    ):
        v.check(key not in code, "Código morto reintroduzido: " + key)
    v.check(code.count("cv.toDataURL('image/png')") == 1,
            "Exportação PNG voltou a ser duplicada")
    v.check(code.count("cad3dConfigureExport4K();") == 2,
            "Exportadores não usam o mesmo viewport 4K")
    geo, camera, shared_export, images, side = (fragments[i] for i in (0, 4, 8, 9, 10))
    v.check("const cp=[];" not in geo and
            "const a0=pl[0],a1=pl[pl.length-1];e.push(" in geo,
            "Arestas idênticas do piso do CAD voltaram a ser duplicadas")
    v.check("function cad3dSetExportSurfaces(" in shared_export and
            "function cad3dSnapshotExportSurfaces(" in shared_export and
            "function cad3dRestoreExportState(" in shared_export,
            "Material/snapshot dos exportadores CAD deixou de ser compartilhado")
    for property_name in ("fov: cam.fov", "aspect: cam.aspect", "up: cam.up.clone()",
                          "view: cam.view ?", "cam.clearViewOffset()", "cam.setViewOffset("):
        v.check(property_name in shared_export, "Câmera CAD não restaurada: " + property_name)
    v.check("rs();" not in shared_export, "Exportação redimensiona a cena duas vezes")
    v.check("cad3dSetExportSurfaces(0.27, 0.39)" in images and
            "cad3dSetExportSurfaces(0.23, 0.37)" in side,
            "Transparências específicas das imagens CAD mudaram")
    v.check(images.count("await cad3dExportDelay(700)") == 2 and
            "cad3dRestoreExportState(state)" in images,
            "Falha na sequência/restauração das três imagens CAD 4K")
    v.check("await cad3dExportDelay(400)" in side and
            "resetIsometricAppearance();" in side and
            "cad3dRestoreExportState(state)" in side,
            "Falha na sequência/restauração dos dois PNGs laterais")
    v.check("if (ren.getPixelRatio() !== ratio)" in camera and
            "try { upd(); } catch(err)" in camera and
            "warmed = true;" in camera,
            "Pré-aquecimento ou otimização do WebGL CAD ausentes")


def verify_aba3(v: Checker) -> None:
    """Três fragmentos da comparação no mesmo escopo CAD e isolamento da exportação."""
    cad = v.read("source/html/ABA2/cad3d.js")
    manifest = v.read("source/html/ABA3/bin-comparison-renderers.js")
    prefix = "source/html/ABA3/renderers/"
    names = ("01-dimensions.js", "02-alpha-top-view.js", "03-conventional-top-view.js")
    expected = [f"@@APHA_INCLUDE:{prefix}{name}@@" for name in names]
    include = "@@APHA_INCLUDE:source/html/ABA3/bin-comparison-renderers.js@@"
    if cad is not None:
        v.check(cad.count(include) == 1, "Inclusão dos renderers da Aba 3 ausente/duplicada")
        v.order(cad, (include, "@@APHA_INCLUDE:source/html/ABA2/cad3d/10-export-images.js@@"),
                "Ordem do renderer/exportador da Aba 3 alterada")
    if manifest is not None:
        v.check(manifest.splitlines() == expected,
                "Manifesto dos renderers da Aba 3 ausente ou fora de ordem")
    chunks = [v.read(prefix + name) for name in names]
    if all(chunk is not None for chunk in chunks):
        code = "\n".join(chunks)
        for required in (
            "function drawTopDimension(", "(function novaFront() {",
            "(function conventionalSVGTopView(){", "window.novaEnter =",
            "window.__novaRender =", "window.__convDraw=draw;",
            "window.__convCapture=", "window.novaShowHeader=",
            "const SHELL_HEIGHT_FACTOR=0.89;", "const bagWidthFitted=Math.min(",
            "bagHeightSvg=22*inchSvg;", "drawTopDimension(dx, xa, xb",
            "drawTopDimension(c,a[0],b[0]",
        ):
            v.check(required in code, f"Função ou geometria da comparação ausente: {required}")
        v.check(code.count("new THREE.WebGLRenderer(") == 2,
                "Quantidade de renderizadores Alpha/convencional alterada")
        alpha = chunks[1]
        conv = chunks[2]
        for obsolete in (
            "const body=bags[2].mBody;", "const ribs=mPl;", "const wheels=mBlk;",
            "const metal=mMet;", "o.material=body;", "o.material=ribs;",
            "o.material=wheels;", "o.material=metal;",
            "new ResizeObserver(draw).observe(alphaBox);",
        ):
            v.check(obsolete not in conv, "Código redundante da Aba 3 retornou: " + obsolete)
        v.check("b.traverse(o=>{ if(o.isLineSegments||o.isLineLoop)o.visible=false; });" in conv,
                "Contornos originais da mala convencional deixaram de ser ocultados")
        v.check("if(renderer.getPixelRatio()!==dpr)" in conv and
                "renderer.getSize(renderedSize);" in conv and
                "if(renderedSize.x!==W||renderedSize.y!==H)" in conv,
                "Renderizador convencional voltou a redimensionar sem necessidade")
        v.check("new ResizeObserver(draw).observe(box);" in conv,
                "Observador da área convencional ausente")
        v.check("const nvLineShift = new THREE.Matrix4();" in alpha and
                "premultiply(nvLineShift.makeTranslation(" in alpha and
                "for (let k = 0; k < 9; k++)" in alpha,
                "Geometria/otimização do traçado Alpha alterada")
        v.check("if (nvPixelRatio !== ratio)" in alpha and
                "if (nvWidth !== r.width || nvHeight !== r.height)" in alpha,
                "Aba 3 Alpha recria o buffer WebGL desnecessariamente")
        v.check("const SHELL_HEIGHT_FACTOR=0.89;" in conv and
                "const bagWidthFitted=Math.min(" in conv and
                "const BACK_BAGS = [0, 1];" in alpha,
                "Proporções/oclusões originais dos compartimentos alteradas")
    exp = v.read("source/html/ABA3/export.js")
    if exp is not None:
        for required in (
            "previousState = stateKeys.map(", "Object.prototype.hasOwnProperty.call(window, key)",
            "if (present) window[key] = value;", "else delete window[key];",
            "window.__novaNoDim = true; window.__convNoDim = true; window.__novaK = K;",
            "out.toBlob(", "window.exportBinsPNG",
        ):
            v.check(required in exp, "Isolamento da exportação Aba 3 alterado: " + required)


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
    for key in ("const N_ST = 6, STAGE_SEC = 1.2;",
                "const GEO_A = { mod: 127.6, lat: [53.8, 123.9] };",
                "const GEO_C = { mod: 180.47, lat: [51.7, 125.5] };",
                "const PDFR = 0.87033, XC0 = 4.2;",
                "dimPDF(xa, xa + cm(GEO_A.mod)", "dimPDF(xa, xa + cm(GEO_C.mod)",
                "const xFirst = 25.5, xSixteen = 1128, yDim = 398;",
                "const xAlphaEnd = 1407.3, xConvEnd = 1430, yShort = 268;",
                "function prepareVectorImage(", "img.onerror = err =>",
                "img.__failedRasterSize === sizeKey", "if (image) ctx.drawImage(",
                "lastDrawnWidth = stage.offsetWidth",
                "const ctx = cv.getContext('2d');",
                "const kk = s / 50;",
                "btn.textContent = '↻ Replay';"):
        v.check(key in animation, "Contrato de desenho/otimização da Aba 4 ausente: " + key)
    v.check(animation.count("const kk = s / 50;") == 1,
            "Escala do PDF voltou a ser calculada duas vezes por quadro na Aba 4")
    v.check(animation.count("cv.getContext('2d')") == 1 and
            animation.index("const ctx = cv.getContext('2d');") < animation.index("function draw()"),
            "Contexto Canvas 2D voltou a ser solicitado dentro do desenho")
    v.check(animation.count("btn.textContent = '↻ Replay';") == 1 and
            animation.index("btn.textContent = '↻ Replay';") < animation.index("function refresh()"),
            "Botão Replay voltou a ser atualizado a cada quadro")
    for obsolete_comment in ('somem quando todos os bins surgem',
                             'selo "+25% CAPACITY" e propagação',
                             'Renderer 2D convencional substituído'):
        v.check(obsolete_comment not in animation,
                "Comentário obsoleto retornou à Aba 4: " + obsolete_comment)
    for unused in ("capIdx:", "const STAGES =", "fadeD = 1", "A.detOut",
                   "A.binA", "A.lay =", "window.topSetDetOut", "window.topSetBinA",
                   "window.topModules", "window.ERGO_DARK", "window.BIN_SOLID",
                   "window.BIN_DARK", "top-scrub"):
        v.check(unused not in animation,
                "Código antigo da Aba 4 retornou: " + unused)
    director = v.read("source/html/ABA8/director-and-recording.js")
    if director is not None:
        for api in ("topTourReset", "topTourStart", "topTourSet",
                    "topTourStartAt", "topSetOv", "topTourEnd", "topTourDone"):
            v.check("window." + api in animation and "window." + api in director,
                    "Integração da Aba 4 com a Aba 8 alterada: " + api)
    export = v.read("source/html/ABA4/export.js")
    if export is not None:
        v.check("window.topExportPNG" in export and
                "top-view.png" in export and "output.toBlob(" in export,
                "Exportação manual opcional da Aba 4 alterada")


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
        v.check("setAnimLabel(" not in controller,
                "Aba 6: referência órfã de setAnimLabel bloqueia a animação do tour")
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
    script = v.read("source/html/ABA7/animation.js")
    scenes = v.read("source/html/ABA7/closing-scenes.css")
    comp = v.read("source/html/ABA7/svg/illustration-08.svg")
    shared = v.read("source/css/global.css")
    if script is not None:
        for key in ("const DURATION = 30000", "const NO_LOGO_DURATION = 26400",
                    "const LOGO_DURATION = 3600", "const fontsReady =",
                    "function startSegment(request, mode)", "const request = version",
                    "window.closingPlaySegment = playSegment", "window.closingDone ="):
            v.check(key in script, "Reprodução da Aba 7 perdeu contrato: "+key)
        v.check("cancelAnimationFrame(raf);\n        if (!t0) return;" not in script,
                "Timer do encerramento voltou a cancelar seu próprio RAF")
    if scenes is not None:
        for forbidden in (".pill{", ".lbl{", ".lead{", ".ckd{", ".cw{",
                          "s1-spin{", ".operator-benefits-workflow"):
            v.check(forbidden not in scenes, "CSS antigo da Aba 7 retornou: "+forbidden)
        v.check("#scene-2 .hcs{position:absolute;left:40px;" in scenes,
                "Posição do compósito da Aba 7 não centralizada")
        for dimension in ("#scene-3 .clip{width:92px;", "#scene-3 .stamp{width:96px;",
                          "#scene-3 .sw{position:relative;width:115px;"):
            v.check(dimension in scenes, "Dimensões da Cena 3 alteradas: "+dimension)
    if comp is not None:
        v.check(comp.count('style="') == 0 or 'style=' not in comp.split('>', 1)[0],
                "SVG do compósito voltou a ter style inline duplicado")
        v.check('id="_1883041856384"' not in comp,
                "Identificador CAD abandonado retornou ao compósito")
    profile = v.read("source/html/ABA7/svg/illustration-10.svg")
    workflow = v.read("source/html/ABA7/svg/illustration-01.svg")
    pins = v.read("source/html/ABA7/svg/illustration-02.svg")
    if profile is not None:
        v.check('style="width:455px;height:190px;margin-right:4px"' not in profile and
                'preserveAspectRatio="none"' in profile,
                "Dimensões dos perfis devem vir do CSS, sem alterar proporções")
    if workflow is not None:
        v.check('id="s1-workflow"' not in workflow and
                'role="img" aria-label="Operator Benefits and IP Connection: financial and passenger workflow"' in workflow,
                "Grupo de benefícios perdeu acessibilidade ou recuperou ID inútil")
    if pins is not None:
        v.check(all('id="s2-pin'+str(i)+'"' not in pins for i in (1, 2, 3)) and
                'class="pin"' not in pins,
                "IDs ou classe não usados retornaram aos marcadores")
    if scenes is not None:
        v.check('#scene-2 .alus{width:455px;height:190px;flex:none;overflow:visible;margin-right:4px}' in scenes,
                "Dimensões efetivas dos perfis de alumínio foram alteradas")
        for color_rule in ('#scene-1 .fil0{', '#scene-2 .fil4{',
                           '#scene-2 .fil9{', '#scene-2 .fil10{', '#scene-2 .fil11{'):
            v.check(color_rule not in scenes, "Seletor de cor órfão retornou: " + color_rule)
    if shared is not None:
        v.check("closing-illustrations.css" not in shared,
                "Folha obsoleta da Aba 7 voltou ao CSS global")


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
        controller = v.read("source/html/ABA6/controller.js")
        v.check("function bridgeStowPhase(b, currentPhase)" in director and
                "window.__aphaTourAba6ClockReady = initialPhase =>" in director and
                "const phase=bridgeStowPhase(b,manikinState.phase)" in director and
                "1-bridgeEase((phase-.96)/.04)" in director and
                controller is not None and
                "window.__aphaTourAba6ClockReady(manikinState.phase)" in controller,
                "Ponte 5→6 voltou a usar fase anterior sem sincronizar o relógio da Aba 6")
        v.check("function cleanupRecording(r)" in director and
                "function captureGeometryCache(" in director and
                "function verifyBridgeSeam(b)" in director and
                "if (!completed) throw new Error" in director,
                "Aba 8: restauração, recorte, continuidade ou timeout sem proteção")
        v.check(all(dead not in director for dead in ("function snapFinish(",
                "function buildZip(", "console.assert(", "function fxClear() {}",
                "drawUnifiedCabinBackground(g, W, H, { tour: true })")),
                "Aba 8: código morto ou verificações insuficientes retornaram")
    if css is not None:
        v.check(v.has_css(css, "#scene-1 #s1-stage{width:1920px;height:1080px"),
                "Enquadramento do encerramento 1 alterado")
        v.check(v.has_css(css,
                "#scene-2 #s2-stage{position:absolute;left:0;top:0;width:1920px;height:1080px"),
                "Enquadramento do encerramento 2 alterado")
    fragment = v.read("source/html/ABA8/ABA8.html")
    if fragment is not None:
        v.check('id="tour-snap"' not in fragment and
                len(re.findall(r"data-take-rec=", fragment)) == 5,
                "Aba 8: exportador ZIP oculto retornou ou cinco takes perdidos")
    if html is not None:
        for marker in ("window.cad3dTourMorph", "fitBagDimensionLabels",
                       "async function fxNovaIn", "async function fxCabinToStow",
                       "function measureNovaCol", "function startCrossfade"):
            v.check(marker in html, f"Handler de transição/cotas ausente: {marker}")
        v.check(len(re.findall(r"<script\b", html)) == 12,
                "Número de blocos script do HTML final alterado")


def verify_html_cleanup(v: Checker) -> None:
    """Protege remocoes pontuais sem perder a navegacao ou os takes."""
    pax = v.read("source/html/ABA1/index.template.html")
    pax_css = v.read("source/html/ABA1/styles.css")
    top = v.read("source/html/ABA4/ABA4.html")
    top_js = v.read("source/html/ABA4/animation.js")
    manikin = v.read("source/html/ABA6/manikin.js")
    cad = v.read("source/html/ABA2/cad3d.js")
    cad_export = v.read("source/html/ABA2/cad3d/10-export-images.js")
    hidden = v.read("source/html/ABA8/tour-controls-hidden.css")
    if pax is not None:
        v.check(pax.count("<div") == pax.count("</div>"),
                "Iframe da Aba 1 voltou a ter divs desbalanceadas")
    if pax_css is not None:
        v.check(pax_css.count("\n#viewport {") == 1 and
                pax_css.count("button:hover {") == 1 and
                "body.no-ctl #viewport" in pax_css and
                "aspect-ratio: 16 / 9" in pax_css,
                "CSS ou enquadramento da Aba 1 foi duplicado/alterado")
    if top is not None and top_js is not None:
        v.check("top-chips" not in top and "top-chips" not in top_js and
                'id="top-scrub"' not in top and
                "document.getElementById('top-scrub')" not in top_js and
                'id="top-play"' in top and
                "window.topTourSet =" in top_js,
                "Controle oculto obsoleto ou perda da reprodução/sincronização da Aba 4")
    if manikin is not None:
        v.check("ergo-overlay" not in manikin and
                "aba6-lbl-anim-btn" not in manikin and
                "setAnimLabel(" not in manikin and
                "dismissCards();" not in manikin and
                "cardsShown" not in manikin and
                "PDFN_SIL_D" not in manikin and
                "function drawManikinPanel(" in manikin,
                "Codigo obsoleto de cartões/silhueta ou perda do manequim ativo na Aba 6")
    if cad is not None and cad_export is not None:
        v.check("[data-cad3d-v]" not in cad and
                "[data-cad3d-v]" not in cad_export and
                "views.iso" in cad_export and "views.side" in cad_export,
                "Handler morto voltou ou cameras reais da Aba 2 foram removidas")
    if hidden is not None:
        v.check("#cad3d-export-side" not in hidden and
                "[data-cad3d-v]" not in hidden and
                hidden.count("#tour-stage #uni-export,") == 1 and
                hidden.count("#tour-stage #uni-export-p95,") == 1,
                "CSS de controles fantasmas ou ocultacao duplicada voltou")


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
        ("Aba 1: avião e exportação", verify_aba1_aircraft),
        ("Aba 1: passageiros", verify_aba1_passengers),
        ("Aba 2: CAD 3D", verify_aba2),
        ("Aba 3: comparação", verify_aba3),
        ("Aba 4: SVG", verify_aba4),
        ("Aba 6: controlador", verify_aba6_controller),
        ("Aba 7: conclusão", verify_aba7),
        ("Limpeza HTML/CSS", verify_html_cleanup),
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
