<!-- disciplinas: * -->
# Orçamento e pesquisa de preços

## Preço em cascata (sem IA)
1. Catálogo H&M (vínculo aprendido ou semelhança de texto com confiança de confirmação).
2. Cotações de fornecedores dos últimos 180 dias.
3. Mediana do **vendido** em propostas aprovadas (por disciplina).
4. SINAPI da UF configurada — só **indicativa**, fora da média (busca por palavras).
5. Web pela IA — **só com permissão** do usuário (gasta cota) ou quando não há referência nenhuma.
- Preço lido por IA (cotação ou catálogo) não confirma item até alguém conferir.

## Critério QF-CAG da planilha de pesquisa de preços
- Colunas: **Item | Tag | Descrição | Referência pesquisada | Qtd | Un | Preço unit. | Total | Origem do preço | Faixa encontrada | Fonte | Observação**.
- **Origem do preço:** *Pesquisado* (cotação de fornecedor ou loja/web, com fonte e data) · *Estimativa H&M* (vendido/catálogo — precisa de cotação) · *Cliente* (preço informado pelo cliente) · *A cotar* (sem referência: preço em branco, fora do total, [CONFERIR]).
- Itens em **grupos** com subtotal; resumo por origem com SOMASES/CONT.SES; **contingência editável (padrão 10 %)**; **TOTAL MATERIAL sem BDI e sem mão de obra**; legenda das origens; notas de **data-base** e do que **não inclui** (mão de obra, BDI, frete, impostos sobre serviço, itens fornecidos pelo cliente, itens a cotar).
- Preço de varejo/loja: com CNPJ em distribuidor tende a sair menor — **tratar como teto**.
- A resposta do agente traz: total do material e com contingência; tabela por grupo; itens que mais pesam com a fonte; pesquisado × estimativa; onde economizar (referência mais barata do mesmo item ou linha econômica, com menor robustez); mudanças em relação ao anteprojeto (modelo especificado × pesquisado); itens que dependem da Icc (disjuntores, DPS, barramento podem mudar de versão e preço).

## Gerar orçamento
- Pela análise ou pelo projeto ("Gerar orçamento"): o motor casa cada material com o catálogo (preço → confirmado), põe a mão de obra pelo preço de referência e usa o aprendido nas propostas aprovadas da disciplina; o resto fica "a cotar".
- "Gerar orçamento" não sobrescreve proposta de outro usuário (403). O agente também não sobrescreve proposta Ativa que não criou: pede confirmação.
- BDI e impostos padrão vêm de Administração › Integrações; sem eles, ficam 0 e o sistema avisa.
