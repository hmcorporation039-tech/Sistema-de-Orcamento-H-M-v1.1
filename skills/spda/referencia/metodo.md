# Método de cálculo — resumo das regras da NBR 5419:2026 usadas na skill

Texto de apoio para explicar resultados ao engenheiro. Os valores numéricos das tabelas estão em `scripts/lib/tabelas.js`, cada um com a tabela de origem.

## NBR 5419-2:2026 — análise de risco

- **Risco tolerável (Tabela 4):** R1 (vida humana) = 10⁻⁵/ano; R3 (patrimônio cultural) = 10⁻⁴/ano.
- **R1 = RA + RB + RC + RM + RU + RV + RW + RZ** (Eq. 1). RC, RM, RW e RZ só entram em estruturas com risco de explosão ou onde a falha de sistemas internos põe vida em risco: na skill, zonas com LO > 0 (Tabela C.2 — explosão e hospital).
- **Eventos (Anexo A):** AD = L·W + 6H(L+W) + π(3H)² (A.1); ND = NG·AD·CD·10⁻⁶; AM = 1000(L+W) + π·500²; NM = NG·AM·10⁻⁶; AL = 40·LL, AI = 4000·LL; NL = NG·AL·CI·CE·CT·10⁻⁶; NI = NG·AI·CI·CE·CT·10⁻⁶.
- **NG:** exclusivamente da Tabela F.1 (F.1.1). Fernando de Noronha tem NG = 0 na tabela.
- **Probabilidades (Anexo B):** PA = PTA·PB; PC = PSPD·CLD (CLD = 1 para sistema interno não blindado, B.4.4); PM = PSPD·PMS com PMS = (KS1·KS2·KS3·KS4)², KS1 = 0,12·wm, KS4 = 1/UW; PU = PTU·PEB·PLD·CLD; PV = PEB·PLD·CLD; PW = PSPD·PLD·CLD; PZ = PSPD·PLI·CLI. Vários sistemas na zona: PC e PM combinados por 1 − Π(1 − Pi) (Eq. 12 e 13).
- **Perdas (Anexo C):** LA = LU = rt·LT·(nz/nt)·(tz/8760)·rs; LB = LV = rp·rf·hz·LF·(nz/nt)·(tz/8760)·rs; LC = LM = LW = LZ = LO·(nz/nt)·(tz/8760)·rs.
- **Frequência de danos (Seção 7, nova em 2026):** F = FB + FC + FM + FV + FW + FZ, com FC = ND·PC, FM = NM·PM, FV = (NL+NDJ)·PEB, FW = (NL+NDJ)·PW, FZ = NI·PZ. FT = 0,1/ano para sistemas críticos (não pode ser alterado) e 1/ano para os demais.
- **Se R > RT:** adotar medidas até R ≤ RT (5.4.4); se impossível, informar o proprietário e adotar o NP mais alto (5.4.6). A varredura testa NP do SPDA × NP dos DPS (PSPD e PEB juntos) × fibra óptica nas linhas de sinal, da menor para a maior exigência.

## NBR 5419-3:2026 — SPDA

- **Tabela 2:** esfera rolante R = 20/30/45/60 m e malha 5×5/10×10/15×15/20×20 m para NP I/II/III/IV; uma dimensão do módulo pode crescer 25 % sem aumentar o perímetro (5.3.2.7). Esfera rolante serve para todos os casos (5.3.2.4); malha não serve em superfície curva.
- **Raio protegido por captor vertical** a h metros acima do plano: √(2Rh − h²) (h < R).
- **Descidas (Tabela 5):** 10/10/15/20 m; mínimo 2; espaçamento até +20 % sem reduzir a quantidade (5.4.3.3); conector de ensaio a ~1,5 m (5.4.6).
- **Fixação (5.6.2.2):** 1,0 m na horizontal, 1,5 m na vertical/inclinado.
- **Aterramento:** anel ≥ 0,5 m de profundidade a ~1 m das paredes (5.5.3); re ≥ l1, com l1 = 5 m para NP III-IV e, para NP I/II, pela Figura 3 (l1 = 0,03ρ − 10 e 0,02ρ − 11). Se re < l1: lr = l1 − re ou lv = (l1 − re)/2 por descida.
- **Materiais mínimos (Tabelas 7 e 8):** captação/descida cobre 35 mm², alumínio 70 mm², aço zincado 50 mm²; eletrodo cobre 50 mm²; equipotencialização entre barras cobre 16 mm² e instalações internas cobre 6 mm² (Tabelas 9 e 10).
- **Distância de segurança (6.3.2):** s = (ki/km)·kc·l, ki = 0,08/0,06/0,04 (NP I/II/III-IV), km = 1 (ar) ou 0,5 (sólido), kc = 1/0,66/0,44 para 1/2/≥3 descidas. Não se aplica a componentes naturais contínuos (6.3.1.4).
- **Inspeção (Seção 7):** sequência 7.3.2 a–f; periodicidade 1 ano (serviço essencial, áreas classificadas, corrosão severa, explosivos) ou 3 anos; resistência de aterramento não é critério (7.1.4); nenhuma atividade sob ameaça de tempestade (7.1.2); relatório com o conteúdo de 7.5.4.
- **Anexo F (continuidade):** F.1/F.2/F.3 armaduras ≤ 1 Ω (estruturas com perímetro ≥ 200 m: 50 % dos pilares na mesma ordem de grandeza); F.4 captação × BEP ≤ 0,2 Ω; F.5/F.6/F.7 compatível com o condutor. Instrumento de 4 fios, 1 A a 5 A, CC ou ≠ 60 Hz; multímetro e terrômetro-alicate não são aceitos.
- **Toque e passo (Seção 8):** dispensadas com ≥ 10 descidas naturais interligadas, acesso limitado a 3 m ou camada isolante equivalente a 5 cm de asfalto; senão, isolação de 100 kV (3 mm de XLPE), barreiras/avisos ou malha de equipotencialização com raio de 3 m.

## Diferenças em relação ao laudo antigo (corrigidas na skill)

- A varredura antiga parava em PSPD = 0,005 e não considerava PB = 0,01; por isso dizia que "nenhum cenário atende". Com DPS melhores que NP I (PSPD = 0,001) o R1 do exemplo cai para 6,6 × 10⁻⁶.
- NCs do checklist e NCs descritas saíam duplicadas; agora a NC descrita substitui a automática.
- Ensaios de ligação equipotencial eram rotulados F.6; no Anexo F de 2026 são F.7 (F.6 é eletrodo não natural).
- "F máx." no resultado mostrava F/FT; agora mostra F da zona mais solicitada contra FT.
- DPS classe I não é listado para linha de fibra óptica sem condutor metálico.
