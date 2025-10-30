"use client";
import React from "react";
import { trpc } from "@/lib/trpc";

export default function AgentAdminPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Agent Exec</h1>
      <CmdRunner />
      <FsPanel />
      <FetchPanel />
    </div>
  );
}

function CmdRunner() {
  const [cmd, setCmd] = React.useState("");
  const [args, setArgs] = React.useState("");
  const [cwd, setCwd] = React.useState("");
  const [override, setOverride] = React.useState(false);
  const run = trpc.agentExec.run.useMutation();
  return (
    <section className="border rounded p-4 space-y-2">
      <h2 className="font-medium">Run Command</h2>
      <div className="flex flex-wrap gap-2 items-center">
        <input className="border px-2 py-1" placeholder="cmd" value={cmd} onChange={e=>setCmd(e.target.value)} />
        <input className="border px-2 py-1 flex-1" placeholder="args (space separated)" value={args} onChange={e=>setArgs(e.target.value)} />
        <input className="border px-2 py-1" placeholder="cwd (optional)" value={cwd} onChange={e=>setCwd(e.target.value)} />
        <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={override} onChange={e=>setOverride(e.target.checked)} /> Override</label>
        <button className="px-3 py-1 rounded bg-black text-white disabled:opacity-50" disabled={!cmd || run.isPending} onClick={()=>run.mutate({ cmd, args: args?args.split(' '):[], cwd: cwd||undefined, override })}>{run.isPending?'Running…':'Run'}</button>
      </div>
      {run.data ? (
        <pre className="whitespace-pre-wrap text-xs p-2 bg-gray-50 border rounded">$ {cmd} {args}\n
exit {run.data.code}\n
{run.data.stdout || run.data.stderr}</pre>
      ) : null}
    </section>
  );
}

function FsPanel() {
  const [path, setPath] = React.useState("");
  const [content, setContent] = React.useState("");
  const [moveTo, setMoveTo] = React.useState("");
  const [override, setOverride] = React.useState(false);
  const read = trpc.agentExec.readFile.useMutation({ onSuccess: (d)=> d.content && setContent(d.content) });
  const write = trpc.agentExec.writeFile.useMutation();
  const remove = trpc.agentExec.remove.useMutation();
  const move = trpc.agentExec.move.useMutation();
  return (
    <section className="border rounded p-4 space-y-2">
      <h2 className="font-medium">File System</h2>
      <div className="flex items-center gap-2">
        <input className="border px-2 py-1 flex-1" placeholder="absolute path" value={path} onChange={e=>setPath(e.target.value)} />
        <input className="border px-2 py-1 flex-1" placeholder="move to (dest path)" value={moveTo} onChange={e=>setMoveTo(e.target.value)} />
        <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={override} onChange={e=>setOverride(e.target.checked)} /> Override</label>
        <button className="px-3 py-1 rounded border" onClick={()=>read.mutate({ path, override })}>Read</button>
        <button className="px-3 py-1 rounded border" onClick={()=>write.mutate({ path, content, override })}>Write</button>
        <button className="px-3 py-1 rounded border" onClick={()=>{
          if (confirm(`Delete ${path}? This cannot be undone.`)) remove.mutate({ path, override });
        }}>Delete</button>
        <button className="px-3 py-1 rounded border" onClick={()=>{
          if (!moveTo) return;
          if (confirm(`Move ${path} -> ${moveTo}?`)) move.mutate({ src: path, dest: moveTo, override });
        }}>Move</button>
      </div>
      <textarea className="w-full min-h-[120px] border rounded p-2" value={content} onChange={e=>setContent(e.target.value)} />
    </section>
  );
}

function FetchPanel() {
  const [url, setUrl] = React.useState("");
  const [method, setMethod] = React.useState<'GET'|'POST'|'PUT'|'DELETE'>("GET");
  const [body, setBody] = React.useState("");
  const [override, setOverride] = React.useState(false);
  const fetcher = trpc.agentExec.fetch.useMutation();
  return (
    <section className="border rounded p-4 space-y-2">
      <h2 className="font-medium">Network Fetch</h2>
      <div className="flex flex-wrap items-center gap-2">
        <select className="border px-2 py-1" value={method} onChange={e=>setMethod(e.target.value as any)}>
          {['GET','POST','PUT','DELETE'].map(m=>(<option key={m} value={m}>{m}</option>))}
        </select>
        <input className="border px-2 py-1 flex-1" placeholder="https://..." value={url} onChange={e=>setUrl(e.target.value)} />
        <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={override} onChange={e=>setOverride(e.target.checked)} /> Override</label>
        <button className="px-3 py-1 rounded bg-black text-white disabled:opacity-50" disabled={!url || fetcher.isPending} onClick={()=>{
          let data:any; try{ data = body? JSON.parse(body): undefined; } catch { data = body; }
          fetcher.mutate({ url, method, body: data, override })
        }}>{fetcher.isPending?'Requesting…':'Send'}</button>
      </div>
      <textarea className="w-full min-h-[120px] border rounded p-2 text-xs" value={body} onChange={e=>setBody(e.target.value)} placeholder="Optional JSON body" />
      {fetcher.data ? (
        <pre className="whitespace-pre-wrap text-xs p-2 bg-gray-50 border rounded">{JSON.stringify(fetcher.data, null, 2)}</pre>
      ) : null}
    </section>
  );
}
