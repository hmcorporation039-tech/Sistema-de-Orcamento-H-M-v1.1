<!-- disciplinas: quadros, eletrica, eletrica_industrial, pressurizacao, climatizacao, automacao -->
# Quadros elétricos e de comando — critérios da H&M

## Projeto do quadro pela especificação do cliente
- Entrada: a especificação/descrição do cliente (PDF, Word, planilha ou texto). O motor lê os requisitos (leitor de especificação, vocabulário em dados por disciplina) e o que é obrigatório e não aparece vira pendência [CONFERIR] — nada é inventado.
- Entrega em folhas: **FL01** unifilar de força · **FL02** comando por relés · **FL03** interfaces e bornes · **FL04** layout (porta e placa, separação força/comando, ventilação) · **FL05** quadro de cargas, materiais com marca/modelo de referência, pendências e exceções. Também o 3D com simulação das manobras.
- **Pedido cortado** ("Com projeto unifilar e 2…"): o agente assume o **pacote padrão (unifilar + comando + layout)** e diz que fez essa interpretação.
- A resposta traz: tabela de folhas, **principais decisões**, **pontos a levantar com o cliente** e **o que falta confirmar**.

## Pontos a levantar sempre na especificação
- **Seletora titular × automação:** com a entrada da automação em paralelo, a automação pode ficar limitada a um equipamento; sugerir seletora titular 1 · REM · titular 2.
- **Ausência de troca automática por falha:** se não está pedida, a reserva não parte sozinha quando a titular falha em AUT.
- **Emergência corta o comando, não a força** dos acionamentos (inversores); cortar a força é contator a mais, fora da especificação.

## Pendências típicas
- **Icc** no ponto de alimentação (Icu/Icw dos disjuntores e do barramento).
- **Borne e tensão do atuador** (24 Vca × 24 Vcc) e borne do sinal no equipamento.
- **Saídas e bornes do inversor** (ou da partida) fornecido por terceiros.
- **Comprimento do cabo** até as cargas (queda de tensão e seção).

## Ressalvas fixas dos documentos
- Marcas e modelos de referência **"ou equivalente"**.
- **Documento preliminar — exige conferência e ART** do engenheiro responsável.
- Carimbo com o nome da H&M (timbrado padrão).

## Fabricação (skill quadros-nbr61439)
- Invólucro pela série comercial, fileiras com módulos DIN, reserva (NBR 5410 Tab. 59), canaletas ≤ 50 %, barramentos (DIN 43671, curto térmico, esforço eletrodinâmico), N/PE (Tab. 58), coordenação Icu × Icc, DR, DPS, elevação de temperatura (IEC TR 60890) e ventilação, IP/IK, forma de separação, 13 verificações de projeto e ensaios de rotina da NBR IEC 61439.
