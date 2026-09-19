# CATÁLOGO DE INSTALADORES OFICIAIS — BOT.IA

## SITUAÇÃO REAL DO AMBIENTE

- status geral: `BLOQUEADO PELO AMBIENTE — INSTALADOR NÃO EXISTE`
- verificação executada: busca física em workspace, `release/`, `INSTALADORES_OFICIAIS/`, `INSTALADORES_ARQUIVADOS/` e diretórios de distribuição.
- confirmação: não foi encontrado nenhum arquivo `BOT.IA-Setup-1.0.2.exe` nem `BOT.IA-Setup-1.0.3.exe` em disco.
- regra: não foi criado instalador falso, nem renomeado arquivo inexistente.

## VERSÃO 1.0.2

- arquivo real em disco: `NÃO ENCONTRADO`
- nome registrado historicamente: `BOT.IA-Setup-1.0.2.exe`
- tamanho real: `NÃO CALCULADO (arquivo ausente no ambiente atual)`
- SHA-256 real: `NÃO CALCULADO (arquivo ausente no ambiente atual)`
- status: `NÃO CERTIFICADO — ARQUIVO INEXISTENTE`
- release: `NÃO PUBLICADA`
- observação: o histórico documental de 1.0.2 não valida a versão; sem arquivo físico presente, SHA-256 calculado e release publicada, a certificação é inválida.

## REGRA DE CERTIFICAÇÃO

- nenhum instalador pode receber status `CERTIFICADO` sem: arquivo `.exe` físico presente no disco, SHA-256 real calculado sobre esse binário e release pública vinculada.
- nenhuma versão futura pode reutilizar hash, metadados ou status de versões anteriores sem recalcular sobre o artefato atual.
- qualquer alegação de certificação sem estes três itens simultaneamente comprovados deve ser tratada como `NÃO CERTIFICADO`.

## VERSÃO 1.0.3

- arquivo real em disco: `NÃO ENCONTRADO`
- nome esperado: `BOT.IA-Setup-1.0.3.exe`
- tamanho real: `NÃO CALCULADO (arquivo ausente no ambiente atual)`
- SHA-256 real: `NÃO CALCULADO (arquivo ausente no ambiente atual)`
- status: `AGUARDANDO VALIDAÇÃO WINDOWS`
- release: `NÃO CRIADA`
- observação: não é possível declarar 1.0.3 certificada, distribuída ou publicada sem o instalador Windows real validado.

## DISTRIBUIÇÃO

- `DISTRIBUICAO/`: `NÃO CRIADO` porque não existe instalador real validado.
- garantia: nenhum `.exe` foi gerado artificialmente para satisfazer a entrega.
- uso de GitHub Release: `NÃO APLICADO` até que o binário real exista e seja validado.