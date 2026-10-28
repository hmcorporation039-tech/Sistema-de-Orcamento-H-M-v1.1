// Assinatura do cliente: canvas próprio (toque, caneta ou mouse), nome e
// documento. Vai como PNG em base64 na operação "assinar" (até 300 KB).
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eraser, Check } from 'lucide-react';
import { useCampo } from './CampoApp';
import { canvasParaPngBase64, tamanhoBase64 } from './imagem';
import { COR, Botao, Cartao } from './componentes';

const LIMITE_PNG = 300 * 1024;

export default function Assinatura() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { dados, visoes } = useCampo();
  const os = visoes.find(v => v.uuid === uuid);
  const canvasRef = useRef(null);
  const desenhando = useRef(false);
  const ultimo = useRef(null);
  const [tracos, setTracos] = useState(0);
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const larguraPreparada = useRef(0); // largura (CSS) com que o quadro foi preparado
  const tracosRef = useRef(0);
  useEffect(() => { tracosRef.current = tracos; }, [tracos]);

  function preparar() {
    const c = canvasRef.current;
    if (!c) return;
    const escala = Math.min(2, window.devicePixelRatio || 1);
    const r = c.getBoundingClientRect();
    larguraPreparada.current = r.width;
    setAviso('');
    c.width = Math.round(r.width * escala);
    c.height = Math.round(r.height * escala);
    const ctx = c.getContext('2d');
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, r.width, r.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setTracos(0);
  }
  useEffect(() => { preparar(); }, []);

  // Girar o celular (ou mudar a largura da janela) muda o tamanho do quadro:
  // sem refazer, o traço sai deslocado do dedo. Refaz o quadro; se já havia
  // assinatura, ela é apagada e a pessoa é avisada. A altura do quadro é fixa,
  // então o teclado abrindo (só muda a altura da janela) não apaga nada.
  useEffect(() => {
    let t = null;
    function aoMudar() {
      clearTimeout(t);
      t = setTimeout(() => {
        const c = canvasRef.current;
        if (!c) return;
        const largura = c.getBoundingClientRect().width;
        if (!largura || Math.abs(largura - larguraPreparada.current) < 1) return;
        desenhando.current = false;
        const havia = tracosRef.current > 0;
        preparar();
        if (havia) setAviso('A tela girou — peça ao cliente para assinar de novo.');
      }, 150);
    }
    window.addEventListener('resize', aoMudar);
    window.addEventListener('orientationchange', aoMudar);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', aoMudar);
      window.removeEventListener('orientationchange', aoMudar);
    };
  }, []);

  function ponto(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function inicio(e) {
    e.preventDefault();
    if (e.pointerId != null && canvasRef.current.setPointerCapture) {
      try { canvasRef.current.setPointerCapture(e.pointerId); } catch { /* ok */ }
    }
    desenhando.current = true;
    ultimo.current = ponto(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(ultimo.current.x, ultimo.current.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
  }
  function mover(e) {
    if (!desenhando.current) return;
    e.preventDefault();
    const p = ponto(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(ultimo.current.x, ultimo.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ultimo.current = p;
  }
  function fim(e) {
    if (!desenhando.current) return;
    e.preventDefault();
    desenhando.current = false;
    setTracos(t => t + 1);
  }

  // Sem Pointer Events (navegador muito antigo): toque e mouse diretos.
  const temPointer = typeof window !== 'undefined' && 'PointerEvent' in window;
  const eventos = temPointer
    ? { onPointerDown: inicio, onPointerMove: mover, onPointerUp: fim, onPointerCancel: fim, onPointerLeave: fim }
    : { onTouchStart: inicio, onTouchMove: mover, onTouchEnd: fim, onMouseDown: inicio, onMouseMove: mover, onMouseUp: fim };

  async function salvar() {
    setErro('');
    if (!tracos) { setErro('Peça ao cliente para assinar no quadro branco.'); return; }
    if (!nome.trim()) { setErro('Informe o nome de quem assinou.'); return; }
    let png = canvasParaPngBase64(canvasRef.current);
    if (tamanhoBase64(png) > LIMITE_PNG) {
      // tela de densidade alta: reduz para 1× antes de desistir
      const c = canvasRef.current;
      const menor = document.createElement('canvas');
      menor.width = Math.round(c.width / 2); menor.height = Math.round(c.height / 2);
      menor.getContext('2d').drawImage(c, 0, 0, menor.width, menor.height);
      png = canvasParaPngBase64(menor);
      if (tamanhoBase64(png) > LIMITE_PNG) { setErro('Assinatura grande demais. Limpe e assine de novo.'); return; }
    }
    setSalvando(true);
    try {
      await dados.registrar('assinar', uuid, { nome: nome.trim(), documento: documento.trim(), png_base64: png });
      navigate(`/campo/os/${uuid}`, { replace: true });
    } catch (e) {
      setErro(e.message || 'Não foi possível guardar a assinatura.');
      setSalvando(false);
    }
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <Botao variante="contorno" onClick={() => navigate(`/campo/os/${uuid}`)} style={{ marginBottom: 12 }}><ArrowLeft size={20} />Voltar à OS</Botao>
      <Cartao>
        <h1 style={{ fontSize: 21, marginBottom: 4 }}>Assinatura do cliente</h1>
        {os && <div style={{ color: COR.texto2, marginBottom: 10 }}>{os.titulo}{os.obra ? ` — ${os.obra.nome}` : ''}</div>}
        <canvas ref={canvasRef} data-testid="canvas-assinatura" aria-label="Quadro para assinar" {...eventos}
          style={{ width: '100%', height: 230, background: '#fff', borderRadius: 10, border: `3px solid ${COR.ouro}`, touchAction: 'none', display: 'block' }} />
        <div style={{ color: COR.texto3, fontSize: 14, marginTop: 4 }}>Assine com o dedo dentro do quadro.</div>
        {aviso && <div role="alert" data-testid="aviso-girou" style={{ color: COR.aviso, fontWeight: 700, marginTop: 6 }}>{aviso}</div>}
        <Botao variante="contorno" onClick={preparar} style={{ marginTop: 10, width: '100%' }}><Eraser size={20} />Limpar</Botao>

        <label htmlFor="ass-nome">Nome de quem assina</label>
        <input id="ass-nome" value={nome} onChange={e => setNome(e.target.value)} autoComplete="off" />
        <label htmlFor="ass-doc">Documento (CPF/RG)</label>
        <input id="ass-doc" value={documento} onChange={e => setDocumento(e.target.value)} autoComplete="off" inputMode="text" />
        {erro && <div role="alert" style={{ color: '#ff8a8a', fontWeight: 700, marginTop: 10 }}>{erro}</div>}
        <Botao grande onClick={salvar} disabled={salvando} style={{ width: '100%', marginTop: 14 }} data-testid="salvar-assinatura">
          <Check size={22} />Guardar assinatura
        </Botao>
      </Cartao>
    </div>
  );
}
