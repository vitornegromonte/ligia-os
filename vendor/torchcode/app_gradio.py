"""
Gradio Space (FREE) que expõe o juiz TorchCode para a Ligia OS.
SDK: gradio | Hardware: ZeroGPU (zero-a10g) | Visibility: public (free, só ZeroGPU disponível)
Deploy: huggingface.co/new-space → sdk: gradio → hardware: ZeroGPU → copie este arquivo para app.py
Ligia chama: POST https://SEUUSER-ligia-torch-judge.hf.space/api/submit/{slug}  {code: "..."}
ZeroGPU: 48h sleep, cold start ~6s, timeout 120s — ideal para torch CPU
"""
import gradio as gr
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

# Permite importar torch_judge do mesmo repo
sys.path.insert(0, str(Path(__file__).parent))

from torch_judge.web_engine import execute_code
from torch_judge.tasks._registry import TASKS

# Compatível com ZeroGPU (gratuito) e local (sem GPU)
try:
    import spaces  # HF ZeroGPU — pip install spaces

    gpu_decorator = spaces.GPU(duration=90)  # 90s por submit, suficiente para torch
except Exception:  # local sem spaces
    def gpu_decorator(fn):
        return fn

    class _Dummy:
        def GPU(self, *a, **kw):
            return lambda fn: fn

    spaces = _Dummy()

# FastAPI com mesmo contrato de api/main.py
app = FastAPI(title="Ligia Torch Judge (ZeroGPU Free)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/tasks")
def list_tasks():
    return [{"id": k, "title": v["title"], "difficulty": v["difficulty"]} for k, v in TASKS.items()]

@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    task = TASKS.get(task_id)
    if not task:
        return {"error": "not found"}
    return {
        "id": task_id,
        "title": task["title"],
        "difficulty": task["difficulty"],
        "hint": task["hint"],
        "function_name": task["function_name"],
    }

@app.post("/api/submit/{task_id}")
@gpu_decorator
def submit(task_id: str, payload: dict):
    code = payload.get("code", "")
    result = execute_code(task_id, code)
    return result

# Gradio UI opcional para teste manual (acessível em /gradio)
@spaces.GPU(duration=60)
def _gradio_fn(task_id: str, code: str):
    import json
    res = execute_code(task_id, code)
    return json.dumps(res, indent=2, ensure_ascii=False)

with gr.Blocks(title="Ligia Torch Judge") as demo:
    gr.Markdown("## Ligia Torch Judge — Gradio Free\nAPI em `/api/submit/{task_id}` para a Ligia OS. Teste manual abaixo.")
    with gr.Row():
        task_dd = gr.Dropdown(choices=list(TASKS.keys()), value="relu", label="Task")
        code_in = gr.Code(language="python", label="Seu código", lines=14)
    btn = gr.Button("Run Tests", variant="primary")
    out = gr.Code(language="json", label="Resultado")
    btn.click(fn=_gradio_fn, inputs=[task_dd, code_in], outputs=[out])

# Monta Gradio dentro do FastAPI — HF Space roda este app na porta 7860
app = gr.mount_gradio_app(app, demo, path="/")
