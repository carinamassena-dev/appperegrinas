# Configuração dos Cabeçalhos da Planilha

Para que a sincronização funcione (apareça na planilha), as abas do seu Google Sheets **DEVEM** ter os cabeçalhos (primeira linha) preenchidos, pois a automação usa eles para saber onde colocar cada informação.

## 1. Aba "Peregrinas"
Copie e cole estes nomes na linha 1 da aba **Peregrinas**:
(Cada nome deve ficar em uma coluna diferente)

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ID | Nome | WhatsApp | Data Aniversario | Idade | Status Relacionamento | Status | Lider Direta | Bairro | Batizada | CD Status | Fez UV | Fez Encontro | Fez CD | Data Cadastro |

## 2. Aba "Financeiro"
Copie e cole estes nomes na linha 1 da aba **Financeiro**:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| ID | Data | Tipo | Valor | Responsavel | Descricao | Categoria | Observacao |

## 3. Aba "Líderes"
Copie e cole estes nomes na linha 1 da aba **Líderes**:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| ID | Nome | WhatsApp | Email | Mais de Uma | Perfil | Dia | Horario | Modalidade | Endereco | Bairro |

## 4. Aba "Colheita"
Copie e cole estes nomes na linha 1 da aba **Colheita**:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| ID | Nome | WhatsApp | Contato Feito | Bairro | Data Abordagem | Idade | Quem Contactou | Data Contato | Observacao |

---

## ⚠️ Correção Importante na URL

Notei na sua captura de tela que a URL digitada termina com dois pontos (`:`).

**ERRADO:** `.../exec:`
**CORRETO:** `.../exec`

**Ação Necessária:** Vá no Painel Master e apague esse caractere final (`:`) da URL digitada. Mesmo que o "Teste de Conexão" diga sucesso, esse caractere extra pode impedir o envio dos dados reais.
