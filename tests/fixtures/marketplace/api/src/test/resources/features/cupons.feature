Feature: Cupons de desconto
  Regras de aplicacao de cupons no carrinho.

  @RN-CUP-001 @cupom
  Rule: Expired coupon is refused with a clear message

    Scenario: Expired coupon
      Given the coupon NATAL15 expired yesterday
      When the customer applies the coupon "NATAL15"
      Then the coupon must be refused

  @RN-CUP-003 @cupom @promo @critico
  Rule: Coupon is not combined with another promotion

    Scenario: Product on promotion with coupon applied
      Given the cart has "Tenis Run" with 20% promotional discount
      When the customer applies the coupon "BEMVINDO10"
      Then the coupon must be refused

  @RN-CUP-005 @cupom @antifraude
  Rule: First-purchase coupon is valid once per CPF

    Scenario: CPF already bought
      Given the CPF already has an order
      When the customer applies the coupon "BEMVINDO10"
      Then the coupon must be refused
