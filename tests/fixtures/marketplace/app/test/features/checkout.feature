@tela:CheckoutPage
Feature: Checkout
  Finalizacao do pedido com regras de entrega, frete e estoque.

  @RN-CHK-001 @critico @endereco
  Rule: Pedido only finalizes with a valid delivery address
    The order cannot advance without a complete address.

    Scenario: Finish without a valid address
      Given the cart contains one product
      When the customer finishes without a delivery address
      Then the order must not be created

  @RN-CHK-004 @frete @promo @componente:ResumoCarrinho
  Rule: Orders above R$ 299 get free shipping

    Scenario: Order above the limit
      Given the cart totals R$ 350
      When the customer finishes the order
      Then the shipping fee must be zero

  @RN-CHK-007 @estoque
  Rule: Stock is reserved for 15 minutes after payment starts

    Scenario: Reservation when payment starts
      Given the customer started the payment
      When 1 minute passes
      Then the stock must still be reserved

  @RN-CHK-009 @limite
  Rule: Limit of 10 units of the same product per order

    Scenario: Limit exceeded
      Given the cart has 11 units of the same product
      When the customer finishes
      Then the order must be refused
