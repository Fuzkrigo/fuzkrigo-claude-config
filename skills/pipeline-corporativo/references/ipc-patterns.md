# IPC — Comunicação Excel ↔ Python

Comunicação é **sempre** via linha de comando. Nunca `xlwings`, COM Automation ou `win32com`.

## Padrão de Argumentos (Python — argparse)
```python
parser.add_argument("--file", required=True, help="Caminho da planilha .xlsx")
parser.add_argument("--sheet", required=True, help="Nome da aba")
parser.add_argument("--output", required=True, help="Célula de destino (ex: H1)")
```

## Padrão de Retorno
- **Sucesso:** `sys.exit(0)` + `print("OK: ...")`
- **Erro:** `sys.exit(1)` + `print("ERRO: ...", file=sys.stderr)` + `logging.error(...)`

## Padrão VBA para Chamar o .exe
```vba
Set wsh = CreateObject("WScript.Shell")
exitCode = wsh.Run(command, 0, True)  ' 0=janela oculta, True=aguarda término
If exitCode = 0 Then
    MsgBox "Sucesso", vbInformation
Else
    MsgBox "Erro. Verifique o log.", vbCritical
End If
```

**Nunca** `console=True` no PyInstaller em produção — janela preta piscando é percebida como bug.
