import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17120d",
        sand: "#f5efe4",
        clay: "#b7653d",
        kola: "#5f3927",
        palm: "#24483b",
        brass: "#d8aa4f",
      },
      boxShadow: {
        soft: "0 24px 80px rgba(48, 32, 18, 0.14)",
        glow: "0 18px 60px rgba(216, 170, 79, 0.25)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        sweep: {
          "0%": { transform: "translateX(-18%)" },
          "100%": { transform: "translateX(18%)" },
        },
      },
      animation: {
        rise: "rise 480ms cubic-bezier(0.22, 1, 0.36, 1) both",
        sweep: "sweep 8s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
