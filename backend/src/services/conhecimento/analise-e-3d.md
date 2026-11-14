<!-- disciplinas: * -->
# Análise de projeto (PDF, DWG, DXF) e modelo 3D

## O que é o projeto (objetivo)
- A leitura do DWG/DXF entende **o que é o projeto** antes de contar: disciplina e tipo (ex.: subestação abrigada, quadro de comando, planta de CFTV), com a confiança e as evidências (carimbo, títulos, legendas).
- Separa as **vistas** da folha: **principal** (vale para o projeto), **contexto** (base de outro projeto — situação, arquitetura de fundo — ignorada) e **apoio** (cortes, detalhes, legendas).
- Os **componentes** vêm da **relação de materiais** e das **legendas** (numerada, de símbolos, de detalhe) como fonte; o que não bate fica [CONFERIR].
- O **abrigo** (subestação, casa de máquinas) é medido **na escala das cotas** da vista principal.
- No PDF valem o carimbo, a legenda, as tabelas (quadro de cargas, lista de materiais) e os símbolos; o objetivo detalhado sai do CAD.
- Onde ver: cartão "O que é o projeto" na tela da análise; no assistente, a ferramenta objetivo_do_projeto.

## Contagem e medição
- Blocos e símbolos explodidos contados por layer, medida e legenda da prancha; o mesmo aparelho em duas layers só conta uma vez se as posições coincidirem.
- Eletroduto/eletrocalha medidos pelas layers; rota de cabeamento medida vira material (rota × 1,10 + descidas, [CONFERIR]).
- Escala: carimbo > a mais frequente > a mais perto da maior planta; empate = [CONFERIR].
- Pontos do desenho ainda não conferidos no mapa do CAD ficam FORA do orçamento.

## Modelo 3D
- Gerado da arquitetura (DWG/DXF ou PDF convertido), um modelo por planta, só com os pontos REAIS desenhados (nada estimado pela área).
- Mostra o **abrigo e os equipamentos** do objetivo do projeto.
- **Quadros fiéis:** fiação **F/N/PE** com as cores, **barramentos com medidas**, **manobras** (abrir/fechar dispositivos) e os circuitos do diagrama unifilar do projeto.
- **Infraestrutura colorida por tipo** (eletroduto, eletrocalha, perfilado, leito…).
- Abre pela tela da análise (cartão do 3D) ou do projeto; o link curto vale 2 h.
