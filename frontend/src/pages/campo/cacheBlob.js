// Endereços blob: das miniaturas do app de campo, com contagem de uso.
//
// Antes era um Map global que nunca chamava URL.revokeObjectURL: cada foto
// vista ficava na memória do celular até fechar a aba (dezenas de fotos de
// 1600 px numa OS grande). Agora cada miniatura "pega" o endereço ao montar e
// "solta" ao desmontar; sem ninguém usando, o endereço fica guardado só entre
// os últimos `maxLivres` (para voltar à OS sem recarregar tudo) e os mais
// antigos são revogados. limpar() revoga tudo (sair do app / trocar de usuário).

export function criarCacheBlob({ maxLivres = 24, revogar = (u) => URL.revokeObjectURL(u) } = {}) {
  const itens = new Map(); // chave -> { url, usos }
  const livres = [];       // chaves sem uso, da mais antiga para a mais nova

  function tirarDosLivres(chave) {
    const i = livres.indexOf(chave);
    if (i >= 0) livres.splice(i, 1);
  }
  function podar() {
    while (livres.length > maxLivres) {
      const chave = livres.shift();
      const it = itens.get(chave);
      if (it && it.usos === 0) { itens.delete(chave); try { revogar(it.url); } catch { /* ok */ } }
    }
  }

  return {
    // endereço já guardado (e passa a contar um uso), ou null
    pegar(chave) {
      const it = itens.get(chave);
      if (!it) return null;
      it.usos++;
      tirarDosLivres(chave);
      return it.url;
    },
    // guarda um endereço novo com um uso; se outra miniatura já guardou o da
    // mesma foto (carregaram juntas), revoga o novo e devolve o existente
    guardar(chave, url) {
      const it = itens.get(chave);
      if (it) {
        if (it.url !== url) { try { revogar(url); } catch { /* ok */ } }
        it.usos++;
        tirarDosLivres(chave);
        return it.url;
      }
      itens.set(chave, { url, usos: 1 });
      return url;
    },
    soltar(chave) {
      const it = itens.get(chave);
      if (!it || it.usos === 0) return;
      it.usos--;
      if (it.usos === 0) { livres.push(chave); podar(); }
    },
    // a foto saiu do aparelho (descartada): revoga já, se ninguém usa
    esquecer(chave) {
      const it = itens.get(chave);
      if (!it || it.usos > 0) return;
      itens.delete(chave);
      tirarDosLivres(chave);
      try { revogar(it.url); } catch { /* ok */ }
    },
    limpar() {
      for (const it of itens.values()) { try { revogar(it.url); } catch { /* ok */ } }
      itens.clear();
      livres.length = 0;
    },
    tamanho: () => itens.size,
  };
}
