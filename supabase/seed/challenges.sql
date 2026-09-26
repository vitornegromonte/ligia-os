-- Seed challenges from tmp/TorchCode (41) — run after migration 18
insert into public.challenges (slug, title, difficulty, tags, visibility, description, hint, starter_code, function_name, tests, order_index) values
('adam', 'Adam Optimizer', 'Medium', '{}', 'internal', '# 🟠 Medium: Adam Optimizer

Implement the **Adam** optimizer from scratch.

### Signature
```python
class MyAdam:
    def __init__(self, params, lr=1e-3, betas=(0.9, 0.999), eps=1e-8): ...
    def step(self): ...
    def zero_grad(self): ...
```

### Algorithm (per parameter)
```
m = β1 * m + (1-β1) * grad
v = β2 * v + (1-β2) * grad²
m̂ = m / (1 - β1ᵗ)    # bias correction
v̂ = v / (1 - β2ᵗ)
p -= lr * m̂ / (√v̂ + ε)
```', 'Track $m$ (1st moment) and $v$ (2nd moment). $m = \beta_1 m + (1-\beta_1)\nabla$, $v = \beta_2 v + (1-\beta_2)\nabla^2$. Bias correct: $\hat{m} = m/(1-\beta_1^t)$, $\hat{v} = v/(1-\beta_2^t)$. Update: $p \leftarrow p - \text{lr} \cdot \hat{m} / (\sqrt{\hat{v}} + \epsilon)$.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class MyAdam:
    def __init__(self, params, lr=1e-3, betas=(0.9, 0.999), eps=1e-8):
        pass  # store params, init m and v to zeros

    def step(self):
        pass  # update params using Adam rule

    def zero_grad(self):
        pass  # zero all gradients', 'MyAdam', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}]'::jsonb, 0),
('attention', 'Softmax Attention', 'Hard', '{}', 'internal', '# 🔴 Hard: Softmax Attention

Implement the core attention mechanism used in Transformers.

$$\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

### Signature
```python
def scaled_dot_product_attention(
    Q: torch.Tensor,  # (batch, seq_q, d_k)
    K: torch.Tensor,  # (batch, seq_k, d_k)
    V: torch.Tensor,  # (batch, seq_k, d_v)
) -> torch.Tensor:   # (batch, seq_q, d_v)
    ...
```

### Rules
- Do **NOT** use `F.scaled_dot_product_attention`
- You **may** use `torch.softmax` and `torch.bmm`
- Must support autograd
- Must handle cross-attention (seq_q ≠ seq_k)', '$\text{scores} = (Q K^T) / \sqrt{d_k}$, then $\text{softmax}(\text{scores}, \text{dim}=-1) V$. Use `torch.bmm` for batched matmul.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def scaled_dot_product_attention(Q, K, V):
    pass  # Replace this', 'scaled_dot_product_attention', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 1),
('batchnorm', 'Implement BatchNorm', 'Medium', '{}', 'internal', '# 🟡 Medium: Implement BatchNorm

Implement **Batch Normalization** with both **training** and **inference** behavior.

In training mode, use **batch statistics** and update running estimates:

$$\text{BN}(x) = \gamma \cdot \frac{x - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}} + \beta$$

where $\mu_B$ and $\sigma_B^2$ are the mean and variance computed **across the batch** (dim=0).

In inference mode, use the provided **running mean/var** instead of current batch stats.

### Signature
```python
def my_batch_norm(
    x: torch.Tensor,
    gamma: torch.Tensor,
    beta: torch.Tensor,
    running_mean: torch.Tensor,
    running_var: torch.Tensor,
    eps: float = 1e-5,
    momentum: float = 0.1,
    training: bool = True,
) -> torch.Tensor:
    # x: (N, D) — normalize each feature across all samples in the batch
    # running_mean, running_var: updated in-place during training; used as-is during inference
```

### Rules
- Do **NOT** use `F.batch_norm`, `nn.BatchNorm1d`, etc.
- Compute batch mean and variance over `dim=0` with `unbiased=False`
- Update running stats like PyTorch: `running = (1 - momentum) * running + momentum * batch_stat`
- Use `running_mean` / `running_var` for inference when `training=False`
- Must support autograd w.r.t. `x`, `gamma`, `beta` (running statistics should be treated as buffers, not parameters requiring gradients)', 'Implement train/eval BatchNorm: in training, use batch stats over dim=0 and update running_mean/running_var with momentum; in inference, normalize using the running statistics only.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def my_batch_norm(
    x,
    gamma,
    beta,
    running_mean,
    running_var,
    eps=1e-5,
    momentum=0.1,
    training=True,
):
    pass  # Replace this', 'my_batch_norm', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 2),
('beam_search', 'Beam Search Decoding', 'Medium', '{}', 'internal', '# 🟠 Medium: Beam Search Decoding

Implement **beam search** — the classic decoding algorithm for sequence generation.

### Signature
```python
def beam_search(log_prob_fn, start_token, max_len, beam_width, eos_token) -> list[int]:
    # log_prob_fn: takes token list, returns (V,) log-probabilities
    # Returns: best sequence (list of ints)
```

### Algorithm
1. Start with `[(0.0, [start_token])]`
2. Each step: expand each beam with top-k next tokens
3. Keep top `beam_width` beams by total log-probability
4. Stop when best beam ends with `eos_token` or `max_len` reached', 'Maintain beam_width hypotheses. Each step: expand each hypothesis with all tokens, keep top beam_width by total score. Stop when all beams end with eos or max_len reached.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def beam_search(log_prob_fn, start_token, max_len, beam_width, eos_token):
    pass  # maintain beams, expand, prune, return best', 'beam_search', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 3),
('bpe', 'Byte-Pair Encoding (BPE)', 'Hard', '{}', 'internal', '# 🔴 Hard: Byte-Pair Encoding (BPE)

Implement a simple **BPE tokenizer** — the foundation of GPT/LLaMA tokenization.

### Signature
```python
class SimpleBPE:
    def __init__(self): ...
    def train(self, corpus: list[str], num_merges: int): ...
    def encode(self, text: str) -> list[str]: ...
```

### Algorithm (training)
1. Split each word into characters + `</w>` end marker
2. Count all adjacent pairs across the corpus
3. Merge the most frequent pair into a single token
4. Repeat for `num_merges` iterations', 'train: split words into chars + </w>. Iteratively find most frequent adjacent pair, merge it. encode: apply learned merges in order to split text into subwords.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class SimpleBPE:
    def __init__(self):
        self.merges = []

    def train(self, corpus, num_merges):
        pass  # iteratively find & merge most frequent pairs

    def encode(self, text):
        pass  # apply learned merges to split text', 'SimpleBPE', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 4),
('causal_attention', 'Causal Self-Attention', 'Hard', '{}', 'internal', '# 🔴 Hard: Causal Self-Attention

Implement **causal (masked) self-attention** — the attention used in GPT-style decoders.

Same as softmax attention, but each position can **only attend to itself and earlier positions** (no peeking at future tokens).

$$\text{scores}_{ij} = \begin{cases} \frac{Q_i \cdot K_j}{\sqrt{d_k}} & \text{if } j \le i \\ -\infty & \text{if } j > i \end{cases}$$

### Signature
```python
def causal_attention(Q, K, V):
    # Q, K, V: (batch, seq, d) → output: (batch, seq, d_v)
```

### Rules
- Do **NOT** use `F.scaled_dot_product_attention`
- Position $i$ can only attend to positions $\le i$
- You **may** use `torch.softmax`, `torch.bmm`, `torch.triu`', 'Same as softmax attention but mask future positions with -inf before softmax. torch.triu(..., diagonal=1) gives the upper triangle.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def causal_attention(Q, K, V):
    pass  # Replace this', 'causal_attention', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 5),
('conv2d', '2D Convolution', 'Medium', '{}', 'internal', '# 🟠 Medium: 2D Convolution

Implement **2D convolution** from scratch.

### Signature
```python
def my_conv2d(x, weight, bias=None, stride=1, padding=0):
    # x: (B, C_in, H, W), weight: (C_out, C_in, kH, kW)
    # Returns: (B, C_out, H_out, W_out)
```

### Rules
- Do NOT use `F.conv2d` or `nn.Conv2d`
- Support `stride` and `padding` parameters
- `F.pad` for zero-padding is allowed', 'Extract patches using unfold or nested loops. For each output position, sum(patch * kernel). Support stride and padding (zero-pad with F.pad).', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def my_conv2d(x, weight, bias=None, stride=1, padding=0):
    pass  # extract patches, apply kernel, handle stride/padding', 'my_conv2d', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 6),
('cosine_lr', 'Cosine LR Scheduler with Warmup', 'Medium', '{}', 'internal', '# 🟠 Medium: Cosine LR Scheduler with Warmup

Implement a **cosine learning rate schedule** with linear warmup.

### Signature
```python
def cosine_lr_schedule(step, total_steps, warmup_steps, max_lr, min_lr=0.0) -> float:
```

### Schedule
```
step < warmup:  lr = max_lr * step / warmup_steps  (linear ramp)
step >= warmup: lr = min_lr + 0.5*(max_lr-min_lr)*(1 + cos(π * progress))
```
where `progress = (step - warmup) / (total - warmup)`', 'Warmup: linear ramp from 0 to max_lr over warmup_steps. Then cosine decay: min_lr + 0.5*(max_lr-min_lr)*(1+cos(pi*progress)).', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def cosine_lr_schedule(step, total_steps, warmup_steps, max_lr, min_lr=0.0):
    pass  # warmup then cosine decay', 'cosine_lr_schedule', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 7),
('cross_attention', 'Multi-Head Cross-Attention', 'Medium', '{}', 'internal', '# 🟠 Medium: Multi-Head Cross-Attention

Implement **multi-head cross-attention** (encoder-decoder attention).

### Signature
```python
class MultiHeadCrossAttention(nn.Module):
    def __init__(self, d_model: int, num_heads: int): ...
    def forward(self, x_q: Tensor, x_kv: Tensor) -> Tensor:
        # x_q: (B, S_q, D) — decoder queries
        # x_kv: (B, S_kv, D) — encoder keys/values
```

### Key Differences from Self-Attention
- Q comes from the decoder, K and V come from the encoder
- No causal mask (all encoder positions visible)', 'Q from decoder (x_q), K/V from encoder (x_kv). Project, reshape to multi-head, compute scaled dot-product attention (no causal mask). Concat heads and project output.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class MultiHeadCrossAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        pass  # W_q, W_k, W_v, W_o

    def forward(self, x_q, x_kv):
        pass  # Q from x_q, K/V from x_kv, no causal mask', 'MultiHeadCrossAttention', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 8),
('cross_entropy', 'Cross-Entropy Loss', 'Easy', '{}', 'internal', '# 🟢 Easy: Cross-Entropy Loss

Implement **cross-entropy loss** from scratch.

$$\text{CE}(x, y) = -\log\frac{e^{x_y}}{\sum_j e^{x_j}}$$

### Signature
```python
def cross_entropy_loss(logits: Tensor, targets: Tensor) -> Tensor:
    # logits: (B, C) float, targets: (B,) long indices
    # Returns: scalar loss (mean over batch)
```

### Rules
- Do NOT use `F.cross_entropy` or `nn.CrossEntropyLoss`
- Must be numerically stable (use logsumexp trick)', 'log_probs = logits - logsumexp(logits, dim=-1, keepdim=True). Loss = -log_probs[arange(B), targets].mean(). Subtract max for stability (logsumexp handles this).', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def cross_entropy_loss(logits, targets):
    pass  # log_probs = logits - logsumexp(...)', 'cross_entropy_loss', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 9),
('dpo_loss', 'DPO (Direct Preference Optimization) Loss', 'Hard', '{}', 'internal', '# 🔴 Hard: DPO Loss

Implement the **Direct Preference Optimization** loss — the standard loss for LLM alignment.

$$\mathcal{L}_{\text{DPO}} = -\log \sigma\Big(\beta \big[\log\frac{\pi(y_w)}{\text{ref}(y_w)} - \log\frac{\pi(y_l)}{\text{ref}(y_l)}\big]\Big)$$

### Signature
```python
def dpo_loss(policy_chosen_logps, policy_rejected_logps,
             ref_chosen_logps, ref_rejected_logps, beta=0.1) -> Tensor:
    # All inputs: (B,) log-probabilities
    # Returns: scalar loss
```', 'L = -log(sigmoid(beta * ((pi_chosen - ref_chosen) - (pi_rejected - ref_rejected)))). Mean over batch.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def dpo_loss(policy_chosen_logps, policy_rejected_logps,
             ref_chosen_logps, ref_rejected_logps, beta=0.1):
    pass  # -log(sigmoid(beta * (chosen_reward - rejected_reward)))', 'dpo_loss', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 10),
('dropout', 'Implement Dropout', 'Easy', '{}', 'internal', '# 🟢 Easy: Implement Dropout

Implement **Dropout** regularization from scratch.

### Signature
```python
class MyDropout(nn.Module):
    def __init__(self, p: float = 0.5): ...
    def forward(self, x: Tensor) -> Tensor: ...
```

### Rules
- During **training**: zero each element with probability `p`, scale remaining by `1/(1-p)`
- During **eval**: return input unchanged (identity)
- Do NOT use `nn.Dropout` or `F.dropout`', 'During training: randomly zero elements with probability p, scale survivors by 1/(1-p). During eval: identity. Use torch.rand_like and compare with p.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class MyDropout(nn.Module):
    def __init__(self, p=0.5):
        super().__init__()
        pass

    def forward(self, x):
        pass', 'MyDropout', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 11),
('embedding', 'Embedding Layer', 'Easy', '{}', 'internal', '# 🟢 Easy: Embedding Layer

Implement an **embedding lookup table** from scratch.

### Signature
```python
class MyEmbedding(nn.Module):
    def __init__(self, num_embeddings: int, embedding_dim: int): ...
    def forward(self, indices: Tensor) -> Tensor: ...
```

### Rules
- `self.weight`: `nn.Parameter` of shape `(num_embeddings, embedding_dim)`
- Forward: index into weight matrix — `weight[indices]`
- Do NOT use `nn.Embedding`', 'Store a weight matrix of shape (num_embeddings, embedding_dim) as nn.Parameter. Forward = weight[indices].', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class MyEmbedding(nn.Module):
    def __init__(self, num_embeddings, embedding_dim):
        super().__init__()
        pass

    def forward(self, indices):
        pass', 'MyEmbedding', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 12),
('flash_attention', 'Flash Attention (Tiled)', 'Hard', '{}', 'internal', '# 🔴 Hard: Flash Attention (Tiled)

Implement **tiled attention with online softmax** — the core idea behind Flash Attention.

### Signature
```python
def flash_attention(Q, K, V, block_size=32) -> Tensor:
    # Q, K, V: (B, S, D)
    # Returns: (B, S, D) — same as standard attention
```

### Key Insight
Instead of materializing the full S×S attention matrix, process in blocks:
1. For each Q-block, iterate over K/V blocks
2. Use **online softmax**: track running `max` and `sum`
3. Rescale accumulator when max changes: `acc *= exp(old_max - new_max)`
4. Final: `output = acc / row_sum`

Must give **identical** results to standard softmax attention.', 'Process Q in blocks. For each Q-block, iterate over K/V blocks. Use online softmax: track running max and sum, rescale accumulator when max changes. output = acc / row_sum.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def flash_attention(Q, K, V, block_size=32):
    # Process Q in blocks, iterate K/V blocks with online softmax
    pass', 'flash_attention', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 13),
('gelu', 'GELU Activation', 'Easy', '{}', 'internal', '# 🟢 Easy: GELU Activation

Implement the **GELU** (Gaussian Error Linear Unit) activation.

$$\text{GELU}(x) = x \cdot \Phi(x) = x \cdot 0.5 \cdot (1 + \text{erf}(x / \sqrt{2}))$$

### Signature
```python
def my_gelu(x: Tensor) -> Tensor: ...
```

### Rules
- Do NOT use `F.gelu`, `nn.GELU`, or `torch.nn.functional.gelu`
- Use `torch.erf` for the exact version', 'Exact: $x \cdot 0.5 \cdot (1 + \text{erf}(x / \sqrt{2}))$. Or approximate: $0.5x(1+\tanh(\sqrt{2/\pi}(x+0.044715x^3)))$.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def my_gelu(x):
    pass', 'my_gelu', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 14),
('gpt2_block', 'GPT-2 Transformer Block', 'Hard', '{}', 'internal', '# 🔴 Hard: GPT-2 Transformer Block

Implement a full **GPT-2 style Transformer block** — combining everything you''ve learned.

### Architecture (Pre-Norm)
```
x = x + causal_self_attention(ln1(x))
x = x + mlp(ln2(x))
```

### Signature
```python
class GPT2Block(nn.Module):
    def __init__(self, d_model: int, num_heads: int): ...
    def forward(self, x: torch.Tensor) -> torch.Tensor: ...
```

### Requirements
- Inherit from `nn.Module`
- `self.ln1`, `self.ln2`: `nn.LayerNorm(d_model)`
- `self.W_q`, `self.W_k`, `self.W_v`, `self.W_o`: `nn.Linear` for attention
- `self.mlp`: `nn.Sequential(Linear(d, 4d), GELU(), Linear(4d, d))`
- Attention must be **causal** (mask future positions)
- Pre-norm architecture (LayerNorm *before* attention and MLP)
- Residual connections around both attention and MLP', 'Pre-norm: x = x + attn(ln1(x)), x = x + mlp(ln2(x)). MLP: Linear(d, 4d) -> GELU -> Linear(4d, d). Attention must be causal. Inherit from nn.Module.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class GPT2Block(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        pass  # Initialize layers

    def forward(self, x):
        pass  # Pre-norm + causal attention + MLP with residuals', 'GPT2Block', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 15),
('gqa', 'Grouped Query Attention', 'Hard', '{}', 'internal', '# 🔴 Hard: Grouped Query Attention (GQA)

Implement **Grouped Query Attention** — used in LLaMA 2, Mistral, etc. to reduce KV cache size.

Like MHA, but with **fewer KV heads** than Q heads. Each group of Q heads shares the same K/V head.

### Signature
```python
class GroupQueryAttention:
    def __init__(self, d_model: int, num_heads: int, num_kv_heads: int): ...
    def forward(self, x) -> torch.Tensor:  # self-attention
```

### Requirements
- `self.W_q`: `nn.Linear(d_model, d_model)` — full Q projection
- `self.W_k`: `nn.Linear(d_model, num_kv_heads * d_k)` — reduced K projection
- `self.W_v`: `nn.Linear(d_model, num_kv_heads * d_k)` — reduced V projection
- `self.W_o`: `nn.Linear(d_model, d_model)` — output projection
- `d_k = d_model // num_heads`
- Expand KV heads with `repeat_interleave` to match Q heads
- When `num_kv_heads == num_heads`, should behave like standard MHA', 'Like MHA but fewer KV heads. W_k/W_v project to num_kv_heads * d_k dims. Use repeat_interleave to expand KV heads to match Q heads.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class GroupQueryAttention:
    def __init__(self, d_model, num_heads, num_kv_heads):
        pass  # Initialize projections

    def forward(self, x):
        pass  # Self-attention with grouped KV', 'GroupQueryAttention', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 16),
('gradient_accumulation', 'Gradient Accumulation', 'Easy', '{}', 'internal', '# 🟢 Easy: Gradient Accumulation

Implement a **training step with gradient accumulation** — simulating large batches with limited memory.

### Signature
```python
def accumulated_step(model, optimizer, loss_fn, micro_batches) -> float:
    # micro_batches: list of (input, target) tuples
    # Returns: average loss (float)
```

### Algorithm
1. `optimizer.zero_grad()`
2. For each `(x, y)` in micro_batches: `loss = loss_fn(model(x), y) / len(micro_batches)`, then `loss.backward()`
3. `optimizer.step()`
4. Return total accumulated loss

The key insight: dividing each loss by `n` before backward makes accumulated gradients equal to a single large-batch gradient.', 'Zero grads once. For each micro-batch: forward, loss/n_batches, backward. Then optimizer.step(). The loss scaling ensures accumulated grads match a single large batch.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def accumulated_step(model, optimizer, loss_fn, micro_batches):
    pass  # zero_grad, loop (forward, scale loss, backward), step', 'accumulated_step', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}]'::jsonb, 17),
('gradient_clipping', 'Gradient Norm Clipping', 'Easy', '{}', 'internal', '# 🟢 Easy: Gradient Norm Clipping

Implement **gradient norm clipping** — a training stability technique.

### Signature
```python
def clip_grad_norm(parameters, max_norm: float) -> float:
    # Clip gradients in-place so total norm <= max_norm
    # Returns the original (unclipped) total norm
```

### Algorithm
1. Compute total norm: `sqrt(sum(p.grad.norm()^2 for p in parameters))`
2. If total > max_norm: scale all grads by `max_norm / total`
3. Return original total norm', 'Total norm = sqrt(sum(p.grad.norm()^2)). If total > max_norm, scale all grads by max_norm/total. Return original total norm.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def clip_grad_norm(parameters, max_norm):
    pass  # compute total norm, clip if needed, return original norm', 'clip_grad_norm', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 18),
('grpo_loss', 'GRPO (Group Relative Policy Optimization) Loss', 'Hard', '{}', 'internal', '# 🔴 Hard: GRPO Loss

Implement the **Group Relative Policy Optimization (GRPO)** loss — a group-wise, baseline-subtracted REINFORCE objective commonly used in RLAIF (reinforcement learning from AI feedback).

Given a batch of log-probabilities, scalar rewards, and group ids (one group per prompt), define the within-group normalized advantages:

$$A_i = \frac{r_i - \bar r_{g(i)}}{\text{std}_{g(i)} + \epsilon}$$

where \(\bar r_{g(i)}\) and \(\text{std}_{g(i)}\) are the mean and standard deviation of rewards in the group of example \(i\).

The GRPO loss is then the negative advantage-weighted log-probability:

$$\mathcal{L}_{\text{GRPO}} = -\mathbb{E}_i \big[\,\text{stop\_grad}(A_i)\, \log \pi_\theta(y_i)\big].$$

### Signature
```python
from torch import Tensor

def grpo_loss(logps: Tensor, rewards: Tensor, group_ids: Tensor,
              eps: float = 1e-5) -> Tensor:
    """GRPO loss over a batch.

    logps: (B,) policy log-probs for each sampled response
    rewards: (B,) scalar rewards for each response
    group_ids: (B,) integers, same id = same prompt/group
    returns: scalar loss (Tensor)
    """
```', 'Per group, normalize rewards: A_i = (r_i - mean_g) / (std_g + eps). Detach A_i from graph, then return -mean(A_i * logps).', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

from torch import Tensor

def grpo_loss(logps: Tensor, rewards: Tensor, group_ids: Tensor,
              eps: float = 1e-5) -> Tensor:
    pass  # compute normalized advantages per group and return -mean(adv.detach() * logps)', 'grpo_loss', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 19),
('int8_quantization', 'INT8 Quantized Linear', 'Hard', '{}', 'internal', '# 🔴 Hard: INT8 Quantized Linear

Implement a **post-training quantized linear layer** using INT8 weights.

### Signature
```python
class Int8Linear(nn.Module):
    def __init__(self, weight: Tensor, bias: Tensor = None): ...
    def forward(self, x: Tensor) -> Tensor: ...
```

### Quantization (per-channel)
1. `scale = weight.abs().max(dim=1) / 127`
2. `weight_int8 = round(weight / scale).clamp(-128, 127).to(int8)`
3. Store as `register_buffer` (not trainable)
4. Forward: dequantize (`int8.float() * scale`) then matmul', 'Per-channel scale = abs(weight).max(dim=1) / 127. Quantize: round(weight/scale).clamp(-128,127).to(int8). Forward: dequantize and matmul.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class Int8Linear(nn.Module):
    def __init__(self, weight, bias=None):
        super().__init__()
        pass  # quantize weight, register buffers

    def forward(self, x):
        pass  # dequantize and matmul', 'Int8Linear', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 20),
('kv_cache', 'KV Cache Attention', 'Hard', '{}', 'internal', '# 🔴 Hard: KV Cache Attention

Implement **multi-head attention with KV caching** for efficient autoregressive generation.

During LLM inference, recomputing all key/value projections at every step is wasteful.
A **KV cache** stores previously computed K and V tensors so only the new token(s) need projection.

### Signature
```python
class KVCacheAttention(nn.Module):
    def __init__(self, d_model: int, num_heads: int): ...
    def forward(self, x: torch.Tensor, cache=None) -> tuple[torch.Tensor, tuple]:
        # x: (B, S_new, D) — new tokens
        # cache: None or (K_past, V_past) each (B, num_heads, S_past, d_k)
        # Returns: (output, (K_all, V_all))
```

### Requirements
- Inherit from `nn.Module`
- `self.W_q`, `self.W_k`, `self.W_v`, `self.W_o`: `nn.Linear` projections
- When `cache=None` (prefill): apply **causal mask**, return all K/V as cache
- When `cache` provided (decode): concat new K/V with cached, no causal mask needed for single-token decode
- Incremental decode must produce **identical** results to full forward pass

### Key Idea
```
Prefill:  [t0 t1 t2 t3] → full causal attention → cache = (K_{0:3}, V_{0:3})
Decode:   [t4]           → Q=t4, K/V=cache+t4  → cache = (K_{0:4}, V_{0:4})
Decode:   [t5]           → Q=t5, K/V=cache+t5  → cache = (K_{0:5}, V_{0:5})
```', 'Project Q/K/V, reshape to (B, num_heads, S, d_k). If cache exists, concat new K/V with cached along dim=2. Apply causal mask during prefill. Return (output, (K_all, V_all)). Cache tensors: (B, num_heads, S_total, d_k).', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class KVCacheAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        pass  # Initialize W_q, W_k, W_v, W_o

    def forward(self, x, cache=None):
        # 1. Project Q, K, V from x
        # 2. Reshape to multi-head: (B, num_heads, S, d_k)
        # 3. If cache exists, concat new K/V with cached K/V
        # 4. Compute attention (causal mask needed during prefill)
        # 5. Return (output, (K_all, V_all))
        pass', 'KVCacheAttention', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 21),
('layernorm', 'Implement LayerNorm', 'Medium', '{}', 'internal', '# 🟡 Medium: Implement LayerNorm

Implement **Layer Normalization** from scratch.

$$\text{LayerNorm}(x) = \gamma \cdot \frac{x - \mu}{\sqrt{\sigma^2 + \epsilon}} + \beta$$

where $\mu$ and $\sigma^2$ are computed over the **last dimension**.

### Signature
```python
def my_layer_norm(
    x: torch.Tensor,      # input
    gamma: torch.Tensor,   # scale (same size as last dim)
    beta: torch.Tensor,    # shift (same size as last dim)
    eps: float = 1e-5
) -> torch.Tensor:
    ...
```

### Rules
- Do **NOT** use `F.layer_norm` or `torch.nn.LayerNorm`
- Normalize over the last dimension only
- Must support autograd', 'Normalize over the last dim: $(x - \mu) / \sqrt{\sigma^2 + \epsilon}$, then scale by $\gamma$ and shift by $\beta$.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def my_layer_norm(x, gamma, beta, eps=1e-5):
    pass  # Replace this', 'my_layer_norm', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}]'::jsonb, 22),
('linear', 'Simple Linear Layer', 'Medium', '{}', 'internal', '# 🟡 Medium: Simple Linear Layer

Implement a fully-connected linear layer: **y = xW^T + b**

### Signature
```python
class SimpleLinear:
    def __init__(self, in_features: int, out_features: int): ...
    def forward(self, x: torch.Tensor) -> torch.Tensor: ...
```

### Requirements
- `self.weight`: shape `(out_features, in_features)`, init with `randn * (1/√in_features)`
- `self.bias`: shape `(out_features,)`, init as zeros
- Both must have `requires_grad=True`
- `forward(x)` computes `x @ W^T + b`
- Do **NOT** use `torch.nn.Linear`', 'y = x @ W^T + b. Initialize weight with Kaiming scaling: randn * (1/sqrt(in_features)).', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class SimpleLinear:
    def __init__(self, in_features: int, out_features: int):
        pass  # Initialize weight and bias

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        pass  # Compute y = x @ W^T + b', 'SimpleLinear', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}]'::jsonb, 23),
('linear_attention', 'Linear Self-Attention', 'Hard', '{}', 'internal', '# 🔴 Hard: Linear Self-Attention

Implement **Linear Attention** — O(S·D²) instead of O(S²·D), enabling efficient long-sequence processing.

Replace softmax with a **kernel feature map** $\phi$:

$$\text{LinearAttn}(Q,K,V) = \frac{\phi(Q) \left(\phi(K)^T V\right)}{\phi(Q) \cdot \sum \phi(K)}$$

### Feature map
Use $\phi(x) = \text{elu}(x) + 1$ (ensures non-negative features).

### Signature
```python
def linear_attention(Q, K, V):
    # Q: (B, S, D_k), K: (B, S, D_k), V: (B, S, D_v)
    # Returns: (B, S, D_v)
```

### Key insight
Instead of computing the $S \times S$ attention matrix, compute $\phi(K)^T V$ first (a $D_k \times D_v$ matrix), then multiply by $\phi(Q)$.

### Rules
- Must use a feature map (NOT softmax)
- Must be O(S·D²) — should run fast on long sequences
- You **may** use `F.elu`', 'Feature map: phi(x) = elu(x) + 1. Compute phi(Q) @ (phi(K)^T @ V) instead of softmax(Q @ K^T) @ V. Normalize by phi(Q) @ sum(phi(K)).', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def linear_attention(Q, K, V):
    pass  # Replace this', 'linear_attention', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 24),
('linear_regression', 'Linear Regression', 'Medium', '{}', 'internal', '# 🟡 Medium: Linear Regression

Implement **linear regression** using three different approaches — all in pure PyTorch.

Given data `X` of shape `(N, D)` and targets `y` of shape `(N,)`, find weight `w` of shape `(D,)` and bias `b` (scalar) such that:

$$\hat{y} = Xw + b$$

### Signature
```python
class LinearRegression:
    def closed_form(self, X: Tensor, y: Tensor) -> tuple[Tensor, Tensor]: ...
    def gradient_descent(self, X: Tensor, y: Tensor, lr=0.01, steps=1000) -> tuple[Tensor, Tensor]: ...
    def nn_linear(self, X: Tensor, y: Tensor, lr=0.01, steps=1000) -> tuple[Tensor, Tensor]: ...
```

All methods return `(w, b)` where `w` has shape `(D,)` and `b` has shape `()`.

### Method 1 — Closed-Form (Normal Equation)
Augment X with a ones column, then solve:

$$\theta = (X_{aug}^T X_{aug})^{-1} X_{aug}^T y$$

Or use `torch.linalg.lstsq` / `torch.linalg.solve`.

### Method 2 — Gradient Descent from Scratch
Initialize `w` and `b` to zeros. Repeat for `steps` iterations:
```
pred = X @ w + b
error = pred - y
grad_w = (2/N) * X^T @ error
grad_b = (2/N) * error.sum()
w -= lr * grad_w
b -= lr * grad_b
```

### Method 3 — PyTorch nn.Linear
Create `nn.Linear(D, 1)`, use `nn.MSELoss` and an optimizer (e.g., `torch.optim.SGD`).
After training, extract `w` and `b` from the layer.

### Rules
- All inputs and outputs must be **PyTorch tensors**
- Do **NOT** use numpy or sklearn
- `closed_form` must not use iterative optimization
- `gradient_descent` must manually compute gradients (no `autograd`)
- `nn_linear` should use `torch.nn.Linear` and `loss.backward()`', 'Closed-form: augment $X$ with ones column, solve $w = (X^T X)^{-1} X^T y$ via `torch.linalg.lstsq`. Gradient descent: $\nabla w = \frac{2}{N} X^T (\hat{y} - y)$, update $w \leftarrow w - \text{lr} \cdot \nabla w$. `nn.Linear`: create `nn.Linear(D, 1)`, use `MSELoss` + `optimizer.step()` loop.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class LinearRegression:
    def closed_form(self, X: torch.Tensor, y: torch.Tensor):
        """Normal equation: w = (X^T X)^{-1} X^T y"""
        pass  # Return (w, b)

    def gradient_descent(self, X: torch.Tensor, y: torch.Tensor,
                         lr: float = 0.01, steps: int = 1000):
        """Manual gradient descent loop"""
        pass  # Return (w, b)

    def nn_linear(self, X: torch.Tensor, y: torch.Tensor,
                  lr: float = 0.01, steps: int = 1000):
        """Train nn.Linear with autograd"""
        pass  # Return (w, b)', 'LinearRegression', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}, {"name": "test_5", "code": ""}]'::jsonb, 25),
('lora', 'LoRA (Low-Rank Adaptation)', 'Medium', '{}', 'internal', '# 🟠 Medium: LoRA (Low-Rank Adaptation)

Implement **LoRA** — parameter-efficient fine-tuning for large models.

$$h = W_0 x + \frac{\alpha}{r} B A x$$

### Signature
```python
class LoRALinear(nn.Module):
    def __init__(self, in_features, out_features, rank, alpha=1.0): ...
    def forward(self, x: Tensor) -> Tensor: ...
```

### Requirements
- `self.linear`: frozen `nn.Linear` (weight & bias `requires_grad=False`)
- `self.lora_A`: `nn.Parameter(rank, in_features)` — random init
- `self.lora_B`: `nn.Parameter(out_features, rank)` — **zero** init
- Scaling: `alpha / rank`', 'Freeze base linear. Add `lora_A` (rank, in) and `lora_B` (out, rank) as Parameters. B init to zeros. $\text{output} = \text{linear}(x) + (x A^T B^T) \cdot (\alpha/r)$.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class LoRALinear(nn.Module):
    def __init__(self, in_features, out_features, rank, alpha=1.0):
        super().__init__()
        pass  # frozen linear + lora_A + lora_B

    def forward(self, x):
        pass  # base + lora', 'LoRALinear', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 26),
('mha', 'Multi-Head Attention', 'Hard', '{}', 'internal', '', 'Use nn.Linear for Q/K/V/O projections. d_k = d_model // num_heads. Reshape to (B, heads, S, d_k), SDPA per head, concat, output projection.', '', 'MultiHeadAttention', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}, {"name": "test_5", "code": ""}]'::jsonb, 27),
('mlp', 'SwiGLU MLP', 'Medium', '{}', 'internal', '# 🟠 Medium: SwiGLU MLP

Implement the **SwiGLU MLP** (feed-forward network) used in modern LLMs like LLaMA.

$$\text{SwiGLU}(x) = \text{down\_proj}\big(\text{SiLU}(\text{gate\_proj}(x)) \odot \text{up\_proj}(x)\big)$$

where $\text{SiLU}(x) = x \cdot \sigma(x)$

### Signature
```python
class SwiGLUMLP(nn.Module):
    def __init__(self, d_model: int, d_ff: int): ...
    def forward(self, x: torch.Tensor) -> torch.Tensor: ...
```

### Requirements
- Inherit from `nn.Module`
- `self.gate_proj`: `nn.Linear(d_model, d_ff)`
- `self.up_proj`: `nn.Linear(d_model, d_ff)`
- `self.down_proj`: `nn.Linear(d_ff, d_model)`
- Activation: **SiLU** (a.k.a. Swish) — `F.silu` or implement as `x * torch.sigmoid(x)`

### Why SwiGLU?
Unlike the classic `Linear → ReLU/GELU → Linear` FFN, SwiGLU uses a **gating mechanism**:
the gate projection controls information flow, while the up projection provides the content.
This consistently outperforms standard FFNs in practice (PaLM, LLaMA, Mistral all use it).', 'Three nn.Linear layers: gate_proj(d, d_ff), up_proj(d, d_ff), down_proj(d_ff, d). forward(x) = down_proj(silu(gate_proj(x)) * up_proj(x)). SiLU(x) = x * sigmoid(x).', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class SwiGLUMLP(nn.Module):
    def __init__(self, d_model, d_ff):
        super().__init__()
        pass  # Initialize gate_proj, up_proj, down_proj

    def forward(self, x):
        pass  # down_proj(silu(gate_proj(x)) * up_proj(x))', 'SwiGLUMLP', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 28),
('moe', 'Mixture of Experts (MoE)', 'Hard', '{}', 'internal', '# 🔴 Hard: Mixture of Experts (MoE)

Implement a **Mixture of Experts** layer (Mixtral / Switch Transformer style).

### Signature
```python
class MixtureOfExperts(nn.Module):
    def __init__(self, d_model, d_ff, num_experts, top_k=2): ...
    def forward(self, x: Tensor) -> Tensor:
        # x: (B, S, D) -> (B, S, D)
```

### Architecture
- `self.router`: `nn.Linear(d_model, num_experts)` — gating network
- `self.experts`: `nn.ModuleList` of MLPs `(Linear→ReLU→Linear)`
- For each token: select top-k experts, compute weighted sum of their outputs', 'Router: Linear(d, num_experts) -> topk -> softmax. Each expert: Linear->ReLU->Linear. Weighted sum of top-k expert outputs per token.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class MixtureOfExperts(nn.Module):
    def __init__(self, d_model, d_ff, num_experts, top_k=2):
        super().__init__()
        pass  # router + experts

    def forward(self, x):
        pass  # route tokens to top-k experts', 'MixtureOfExperts', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 29),
('opd_loss', 'OPD (On-Policy Distillation) Loss', 'Hard', '{}', 'internal', '# 🔴 Hard: OPD Loss

Implement the **On-Policy Distillation (OPD)** loss used to distill one or more teacher policies into a student policy on trajectories sampled from the student.

For each token position, OPD minimizes a weighted reverse KL from the student distribution to each teacher distribution:

$$\mathcal{L}_{\text{OPD}} = \sum_j w_j\,D_{\text{KL}}\big(\pi_\theta(\cdot \mid x)\;||\;\pi_{E_j}(\cdot \mid x)\big)$$

where

$$D_{\text{KL}}(p||q) = \sum_v p(v)\,[\log p(v) - \log q(v)].$$

### Signature
```python
from torch import Tensor

def opd_loss(student_logits: Tensor,
             teacher_logits: Tensor,
             teacher_weights: Tensor | None = None,
             mask: Tensor | None = None,
             temperature: float = 1.0) -> Tensor:
    """OPD reverse-KL distillation loss.

    student_logits: (..., V) logits from the student policy
    teacher_logits: (..., V) for one teacher, or (T, ..., V) for T teachers
    teacher_weights: optional (T,) weights, normalized internally
    mask: optional (...) token mask, where 1 = include and 0 = ignore
    temperature: softmax temperature used for distillation
    returns: scalar loss (Tensor)
    """
```', 'Compute reverse KL from the student to each teacher: KL(pi_student || pi_teacher) = sum_v p_student(v) * (log p_student(v) - log p_teacher(v)). Average teacher KLs with teacher_weights, apply mask over tokens if provided, and multiply by temperature ** 2.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def opd_loss(student_logits: Tensor,
             teacher_logits: Tensor,
             teacher_weights: Tensor | None = None,
             mask: Tensor | None = None,
             temperature: float = 1.0) -> Tensor:
    pass  # reverse KL: sum_v p_student * (log p_student - log p_teacher)', 'opd_loss', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}, {"name": "test_5", "code": ""}, {"name": "test_6", "code": ""}]'::jsonb, 30),
('ppo_loss', 'PPO (Proximal Policy Optimization) Clipped Loss', 'Hard', '{}', 'internal', '# 🔴 Hard: PPO Clipped Loss

Implement the **PPO (Proximal Policy Optimization)** **clipped surrogate loss**.

Given:
- `new_logps`: current policy log-probs $(B,)$
- `old_logps`: old policy log-probs $(B,)$
- `advantages`: advantage estimates $(B,)$

Define the ratio

$$ r_i = \exp(\text{new\_logps}_i - \text{old\_logps}_i). $$

Then compute
- $L^{\text{unclipped}}_i = r_i A_i$
- $L^{\text{clipped}}_i = \operatorname{clip}(r_i, 1-\epsilon, 1+\epsilon) A_i$

The loss is the negative batch mean of the elementwise minimum:

$$
\mathcal{L}_\text{PPO} = -\mathbb{E}_i\big[\min(L^{\text{unclipped}}_i, L^{\text{clipped}}_i)\big].
$$

Implementation notes: detach `old_logps` and `advantages` so gradients only flow through `new_logps`.

### Signature
```python
from torch import Tensor

def ppo_loss(new_logps: Tensor, old_logps: Tensor, advantages: Tensor,
             clip_ratio: float = 0.2) -> Tensor:
    """PPO clipped surrogate loss over a batch."""
```', 'Compute ratio r = exp(new_logps - old_logps_detached). Form unclipped = r * adv_detached and clipped = clamp(r, 1-clip, 1+clip) * adv_detached. Return the negative mean of min(unclipped, clipped). Gradients should flow only through new_logps.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def ppo_loss(new_logps: Tensor, old_logps: Tensor, advantages: Tensor,
             clip_ratio: float = 0.2) -> Tensor:
    pass  # -mean(min(r * adv, clamp(r, 1-clip, 1+clip) * adv)) with gradients only through new_logps
', 'ppo_loss', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}]'::jsonb, 31),
('relu', 'Implement ReLU', 'Easy', '{}', 'internal', '# 🟢 Easy: Implement ReLU

Implement the **ReLU** (Rectified Linear Unit) activation function from scratch.

$$\text{ReLU}(x) = \max(0, x)$$

### Signature
```python
def relu(x: torch.Tensor) -> torch.Tensor:
    ...
```

### Rules
- Do **NOT** use `torch.relu`, `F.relu`, `torch.clamp`, or any built-in activation
- Must support autograd (gradients should flow back)

### Example
```
Input:  tensor([-2., -1., 0., 1., 2.])
Output: tensor([ 0.,  0., 0., 1., 2.])
```', 'ReLU(x) = max(0, x). Think about element-wise comparison with zero.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def relu(x: torch.Tensor) -> torch.Tensor:
    pass  # Replace this
', 'relu', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 32),
('rmsnorm', 'Implement RMSNorm', 'Medium', '{}', 'internal', '# 🟡 Medium: Implement RMSNorm

Implement **Root Mean Square Layer Normalization** — the normalization used in LLaMA, Gemma, etc.

$$\text{RMSNorm}(x) = \frac{x}{\text{RMS}(x)} \cdot w, \quad \text{RMS}(x) = \sqrt{\frac{1}{d}\sum x_i^2 + \epsilon}$$

### Signature
```python
def rms_norm(x: torch.Tensor, weight: torch.Tensor, eps: float = 1e-6) -> torch.Tensor:
    # Normalize over the last dimension. No mean subtraction (unlike LayerNorm).
```

### Rules
- Do **NOT** use any built-in norm layers
- Normalize over `dim=-1`
- Must support autograd', '$\text{RMS}(x) = \sqrt{\text{mean}(x^2) + \epsilon}$. $\text{RMSNorm}(x) = \frac{x}{\text{RMS}(x)} \cdot \text{weight}$. Simpler than LayerNorm — no mean subtraction.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def rms_norm(x, weight, eps=1e-6):
    pass  # Replace this', 'rms_norm', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 33),
('rope', 'Rotary Position Embedding (RoPE)', 'Hard', '{}', 'internal', '# 🔴 Hard: Rotary Position Embedding (RoPE)

Implement **RoPE** — the position encoding used in LLaMA, GPT-NeoX, and most modern LLMs.

### Signature
```python
def apply_rope(q: Tensor, k: Tensor) -> tuple[Tensor, Tensor]:
    # q, k: (B, S, D) where D is even
    # Returns rotated (q, k) with same shape
```

### Key Idea
Split each vector into consecutive pairs. Rotate each pair by `θ = pos / 10000^(2i/D)`:
```
[x_0, x_1] → [x_0*cosθ - x_1*sinθ, x_0*sinθ + x_1*cosθ]
```
This makes `dot(q_rot[i], k_rot[j])` depend only on `i - j` (relative position).', 'Split into pairs $(x_{\text{even}}, x_{\text{odd}})$. Compute $\theta = \text{pos} \cdot 1/(10000^{2i/d})$. Rotate: $[x_e\cos\theta - x_o\sin\theta, x_e\sin\theta + x_o\cos\theta]$. Stack and flatten.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def apply_rope(q, k):
    # 1. Compute position angles
    # 2. Split into even/odd pairs
    # 3. Apply rotation
    pass', 'apply_rope', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 34),
('sliding_window', 'Sliding Window Attention', 'Hard', '{}', 'internal', '# 🔴 Hard: Sliding Window Attention

Implement **Sliding Window Attention** — used in Longformer, Mistral, etc. for efficient long-context processing.

Each position $i$ can only attend to positions $j$ where $|i - j| \le w$ (the window size).

### Signature
```python
def sliding_window_attention(Q, K, V, window_size):
    # Q, K, V: (batch, seq, d) → output: (batch, seq, d_v)
    # window_size: int — position i attends to [i-w, i+w]
```

### Rules
- Do **NOT** use sparse attention libraries
- Mask positions outside the window with `-inf`
- `window_size=0`: only self — output should equal V
- `window_size >= seq_len`: equivalent to full attention', 'Like softmax attention but position i only attends to positions j where |i-j| <= window_size. Mask the rest with -inf.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def sliding_window_attention(Q, K, V, window_size):
    pass  # Replace this', 'sliding_window_attention', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}, {"name": "test_4", "code": ""}]'::jsonb, 35),
('softmax', 'Implement Softmax', 'Easy', '{}', 'internal', '# 🟢 Easy: Implement Softmax

Implement the **Softmax** function from scratch.

$$\text{softmax}(x_i) = \frac{e^{x_i}}{\sum_j e^{x_j}}$$

### Signature
```python
def my_softmax(x: torch.Tensor, dim: int = -1) -> torch.Tensor:
    ...
```

### Rules
- Do **NOT** use `torch.softmax`, `F.softmax`, or `torch.nn.Softmax`
- Must be **numerically stable** (hint: subtract `max` before `exp`)

### Example
```
Input:  tensor([1., 2., 3.])
Output: tensor([0.0900, 0.2447, 0.6652])  # sums to 1.0
```', 'softmax(x)_i = exp(x_i) / sum(exp(x_j)). Subtract max(x) first for numerical stability.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def my_softmax(x: torch.Tensor, dim: int = -1) -> torch.Tensor:
    pass  # Replace this', 'my_softmax', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}]'::jsonb, 36),
('speculative_decoding', 'Speculative Decoding', 'Hard', '{}', 'internal', '# 🔴 Hard: Speculative Decoding

Implement the **acceptance/rejection step** of speculative decoding — a technique for accelerating LLM inference.

### Signature
```python
def speculative_decode(target_probs, draft_probs, draft_tokens) -> list[int]:
    # target_probs: (K, V) from target (large) model
    # draft_probs: (K, V) from draft (small) model
    # draft_tokens: (K,) tokens sampled by draft model
    # Returns: list of accepted tokens (1 to K)
```

### Algorithm
For each position i = 0, ..., K-1:
1. `ratio = target_probs[i, token_i] / draft_probs[i, token_i]`
2. Accept with probability `min(1, ratio)`
3. If rejected: sample from `normalize(max(0, target - draft))`, append, and stop', 'For each draft token i: accept with prob min(1, p_target[i,token]/p_draft[i,token]). If rejected, sample from max(0, p_target - p_draft) normalized. Return list of accepted tokens (may include one resampled).', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def speculative_decode(target_probs, draft_probs, draft_tokens):
    pass  # accept/reject loop', 'speculative_decode', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}]'::jsonb, 37),
('topk_sampling', 'Top-k / Top-p Sampling', 'Medium', '{}', 'internal', '# 🟠 Medium: Top-k / Top-p (Nucleus) Sampling

Implement **sampling with top-k and top-p filtering** — the standard LLM decoding strategy.

### Signature
```python
def sample_top_k_top_p(logits, top_k=0, top_p=1.0, temperature=1.0) -> int:
    # logits: (V,) unnormalized log-probabilities
    # Returns: sampled token index
```

### Algorithm
1. Scale by temperature: `logits /= temperature`
2. Top-k: keep only top-k logits, set rest to `-inf`
3. Top-p: sort by prob, mask tokens where cumulative prob exceeds p
4. Sample from filtered distribution', 'Apply temperature first. For top-k: set logits below the k-th largest to -inf. For top-p: sort, compute cumsum of probs, mask where cumsum > p. Then sample from softmax.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def sample_top_k_top_p(logits, top_k=0, top_p=1.0, temperature=1.0):
    pass  # temperature, top-k filter, top-p filter, sample', 'sample_top_k_top_p', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 38),
('vit_patch', 'ViT Patch Embedding', 'Medium', '{}', 'internal', '# 🟠 Medium: ViT Patch Embedding

Implement the **patch embedding** layer from Vision Transformer (ViT).

### Signature
```python
class PatchEmbedding(nn.Module):
    def __init__(self, img_size, patch_size, in_channels, embed_dim): ...
    def forward(self, x: Tensor) -> Tensor:
        # x: (B, C, H, W)
        # Returns: (B, num_patches, embed_dim)
```

### Algorithm
1. Reshape image into non-overlapping patches: `(B, C, H, W)` → `(B, N, C*P*P)`
2. Project each patch: `nn.Linear(C*P*P, embed_dim)`
3. `num_patches = (img_size // patch_size) ** 2`', 'Reshape image into patches: (B, C, H, W) -> (B, num_patches, C*P*P). Then project with nn.Linear(C*P*P, embed_dim). num_patches = (img_size/patch_size)^2.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

class PatchEmbedding(nn.Module):
    def __init__(self, img_size, patch_size, in_channels, embed_dim):
        super().__init__()
        pass  # self.num_patches, self.proj

    def forward(self, x):
        pass  # reshape to patches, project', 'PatchEmbedding', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 39),
('weight_init', 'Kaiming Initialization', 'Easy', '{}', 'internal', '# 🟢 Easy: Kaiming Initialization

Implement **Kaiming (He) normal initialization** for weight tensors.

$$W \sim \mathcal{N}(0, \text{std}^2) \quad \text{where} \quad \text{std} = \sqrt{\frac{2}{\text{fan\_in}}}$$

### Signature
```python
def kaiming_init(weight: Tensor) -> Tensor:
    # Initialize weight in-place with Kaiming normal
    # fan_in = weight.shape[1]
    # Returns the weight tensor
```', 'For fan_in mode: std = sqrt(2 / fan_in) where fan_in = weight.shape[1]. Fill with normal(0, std). Return the tensor.', 'import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ✏️ YOUR IMPLEMENTATION HERE

def kaiming_init(weight):
    pass  # fill with normal(0, sqrt(2/fan_in))', 'kaiming_init', '[{"name": "test_0", "code": ""}, {"name": "test_1", "code": ""}, {"name": "test_2", "code": ""}, {"name": "test_3", "code": ""}]'::jsonb, 40)
on conflict (slug) do update set title=excluded.title, difficulty=excluded.difficulty, description=excluded.description, hint=excluded.hint, starter_code=excluded.starter_code, function_name=excluded.function_name;