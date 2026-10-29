let locks = 0;

/** Trava a rolagem da página enquanto houver janela aberta; várias janelas juntas não deixam a página presa. */
export function lockScroll(): () => void {
  locks += 1;
  document.body.style.overflow = "hidden";
  let done = false;
  return () => {
    if (done) return;
    done = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) document.body.style.overflow = "";
  };
}
