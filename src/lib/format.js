export const fmt = v => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(v || 0)

export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
export const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export const TYPE = { income: 'Receita', expense: 'Despesa', investment: 'Investimento' }
export const PAY = { credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito', pix: 'Pix', cash: 'Dinheiro', bank_transfer: 'TED/DOC', other: 'Outro' }
