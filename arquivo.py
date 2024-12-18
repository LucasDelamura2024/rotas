import pandas as pd

# Carregar o arquivo Excel
arquivo_excel = 'base.xlsx'  # Caminho do arquivo (se estiver no mesmo diretório, apenas o nome é suficiente)

# Ler os dados do arquivo Excel
df = pd.read_excel(arquivo_excel)

# Exibir os dados
print(df)

