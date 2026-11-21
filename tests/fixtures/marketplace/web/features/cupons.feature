# language: pt
Funcionalidade: Cupons de desconto
  Regras de aplicação de cupons no carrinho.

  @RN-CUP-001 @cupom
  Regra: Cupom expirado é recusado com mensagem clara

    Cenário: Cupom expirado
      Dado que o cupom NATAL15 venceu ontem
      E o cliente abre "/carrinho/cupom"
      Quando o cliente aplicar o cupom "NATAL15"
      Então o cupom deve ser recusado

  @RN-CUP-003 @cupom @promo @critico
  Regra: Cupom não se soma a outra promoção
    Se um produto já está com desconto promocional, o cupom não se soma a ele.

    Cenário: Produto em promoção com cupom aplicado
      Dado que o carrinho contém "Tênis Run" com 20% de desconto promocional
      Quando o cliente aplicar o cupom "BEMVINDO10"
      Então o cupom deve ser recusado

    Cenário: Carrinho misto aplica o cupom só nos itens sem promoção
      Dado que o carrinho contém um item em promoção e um item com preço cheio
      Quando o cliente aplicar o cupom "BEMVINDO10"
      Então o desconto de 10% deve incidir apenas sobre o item com preço cheio

  @RN-CUP-005 @cupom @antifraude
  Regra: Cupom de primeira compra vale uma vez por CPF

    Cenário: CPF já comprou
      Dado que o CPF já possui um pedido
      Quando o cliente aplicar o cupom "BEMVINDO10"
      Então o cupom deve ser recusado

  @RN-CUP-006 @cupom
  Regra: Desconto de cupom nunca passa de 50% do subtotal

    Cenário: Limite de 50%
      Dado que o carrinho tem subtotal de R$ 160
      Quando o cupom de R$ 100 é aplicado
      Então o desconto deve ser de R$ 80
