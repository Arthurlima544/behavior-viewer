Feature: Pagamento PIX
  Cobranca e estorno via PIX.

  Scenario: Gerar cobranca PIX
    Given a customer chooses PIX
    When the payment is created
    Then a QR code must be returned

  Rule: Estorno PIX deve ocorrer em ate 2 dias uteis
    Scenario: Estorno dentro do prazo
      Given a PIX payment was approved 1 day ago
      When the customer asks for a refund
      Then the refund must be accepted
