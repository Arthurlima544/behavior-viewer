# language: pt
Funcionalidade: Checkout
  Finalização do pedido com regras de entrega, frete e estoque.

  @RN-CHK-001 @critico @endereco
  Regra: Pedido só pode ser finalizado com endereço de entrega válido

    Cenário: Finalizar sem endereço válido
      Dado que o carrinho contém um produto
      Quando o cliente finalizar sem endereço de entrega
      Então o pedido não deve ser criado

  @RN-CHK-004 @frete @promo
  Regra: Pedidos acima de R$ 299 recebem frete grátis

    Cenário: Pedido acima do limite
      Dado que o carrinho soma R$ 350
      Quando o cliente finalizar o pedido
      Então o frete deve ser zero

  @RN-CHK-007 @estoque
  Regra: Estoque é reservado por 15 minutos após iniciar o pagamento

    Cenário: Reserva ao iniciar pagamento
      Dado que o cliente iniciou o pagamento
      Quando 1 minuto se passar
      Então o estoque deve continuar reservado

  @RN-CHK-009 @limite
  Regra: Limite de 10 unidades do mesmo produto por pedido

    Cenário: Limite excedido
      Dado que o carrinho tem 11 unidades do mesmo produto
      Quando o cliente finalizar
      Então o pedido deve ser recusado
