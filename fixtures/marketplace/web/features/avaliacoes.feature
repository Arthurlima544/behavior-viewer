# language: pt
Funcionalidade: Avaliações
  Avaliações de produtos pelos clientes.

  Regra: Avaliação só pode ser feita após a compra
    Cenário: Avaliar produto comprado
      Dado que o cliente comprou o produto
      Quando o cliente enviar uma avaliação
      Então a avaliação deve ser publicada
