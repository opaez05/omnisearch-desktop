import subprocess

def execute():
    try:
        print("Iniciando flujo de Git de fin de jornada...")
        
        # 1. Hacer git add .
        subprocess.run(["git", "add", "."], check=True)
        
        # 2. Hacer el commit con un mensaje automático
        # (Puedes personalizar el mensaje si lo deseas)
        commit_message = "chore: finalización de jornada y guardado de cambios automáticos"
        subprocess.run(["git", "commit", "-m", commit_message], check=True)
        
        # 3. Hacer git push
        # Intenta empujar a la rama actual
        subprocess.run(["git", "push"], check=True)
        
        return "¡Flujo completado con éxito! Cambios guardados y subidos a GitHub."
        
    except subprocess.CalledProcessError as e:
        return f"Error al ejecutar el comando de Git: {e}"
