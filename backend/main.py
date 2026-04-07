from fastapi import FastAPI, UploadFile, File
import shutil
import os

app = FastAPI(title="API de Análisis de Código")

@app.get("/")
def read_root():
    return {"mensaje": "API de Análisis de Código funcionando correctamente"}

@app.get("/health")
def health_check():
    # DevOps usará este endpoint para saber si el contenedor está vivo
    return {"status": "ok"}

@app.post("/upload")
async def upload_code(file: UploadFile = File(...)):
    # Carpeta temporal para guardar el código subido
    os.makedirs("temp_uploads", exist_ok=True)
    file_location = f"temp_uploads/{file.filename}"
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    return {
        "info": f"Archivo '{file.filename}' guardado exitosamente.",
        "status": "Listo para ser enviado a SonarQube y a la IA en el próximo Sprint"
    }