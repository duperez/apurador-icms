"use client";
import { useEffect, useState } from "react";

/**
 * Estado React que persiste no localStorage do navegador.
 * Provisório: na versão com Supabase, isto vira leitura/escrita no banco.
 */
export function useLocalStorage<T>(chave: string, inicial: T) {
  const [valor, setValor] = useState<T>(inicial);
  const [carregado, setCarregado] = useState(false);

  // Lê do localStorage só no cliente (evita erro de hidratação no SSR).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(chave);
      if (raw) setValor(JSON.parse(raw));
    } catch {
      /* ignora JSON inválido */
    }
    setCarregado(true);
  }, [chave]);

  // Grava sempre que muda (depois de carregado).
  useEffect(() => {
    if (carregado) localStorage.setItem(chave, JSON.stringify(valor));
  }, [chave, valor, carregado]);

  return [valor, setValor, carregado] as const;
}
