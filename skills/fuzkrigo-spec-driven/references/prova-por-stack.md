# Prova por stack — Python

`@` e `:` são inválidos num identificador Python, então a etiqueta não cabe no
nome do teste. A convenção é dupla, e o `scaffold` já gera assim:

```python
def test_ac_001():
    """AC-001: Entrega antes do prazo e "no prazo" @spec:AC-001"""
```

- A **docstring** com `@spec:AC-001` é o que o audit lê no arquivo para saber
  que o critério tem teste.
- O **nome** `test_ac_001` é o que o runner reporta, e é por ele que o verify
  casa a prova.

Renomear a função quebra a prova; apagar a docstring faz o critério parecer sem
teste. Mantenha os dois. Vale o mesmo para princípios: `test_p_001`.
