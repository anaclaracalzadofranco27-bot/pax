tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        cad: {
                            bg: APHA_CABIN_PALETTE.background,
                            panel: APHA_CABIN_PALETTE.panel,
                            border: APHA_CABIN_PALETTE.border,
                            cyan: APHA_CABIN_PALETTE.cyan,
                            orange: APHA_CABIN_PALETTE.neutral,
                            green: APHA_CABIN_PALETTE.mid,
                            red: APHA_CABIN_PALETTE.neutral,
                            purple: APHA_CABIN_PALETTE.cyan
                        }
                    }
                }
            }
        }
