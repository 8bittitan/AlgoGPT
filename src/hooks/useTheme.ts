import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  const changeTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    const el = document.documentElement;

    if (theme === "dark") {
      el.classList.add("dark");
    } else {
      el.classList.remove("dark");
    }
  }, [theme]);

  return {
    theme,
    changeTheme,
  };
}
