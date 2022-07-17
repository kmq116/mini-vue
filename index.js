let activeEffect;
const bucket = new WeakMap();
const data = { text: "hello world", ok: false };

const obj = new Proxy(data, {
  get(target, key) {
    track(target, key);
    return target[key];
  },
  set(target, key, value) {
    target[key] = value;
    trigger(target, key);
    return true;
  },
});
effect(() => {
  console.log("effect 读取 text 的操作", obj.text);
  //  读取是存储副作用函数
  document.body.innerText = obj.ok ? obj.text : "not";
});

// 注册effect
function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    fn();
  };
  //利用指针将  effectFn 和 activeEffect 指向同一个 进行依赖收集
  effectFn.deps = [];
  effectFn();
}
setTimeout(() => {
  obj.text = "hello proxy";
  obj.noExist = "hello proxy";
}, 1000);
setTimeout(() => {
  obj.text = "123123123";
  obj.noExist = "hello proxy";
  console.log(bucket);
}, 2000);

function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i];
    deps.delete(effectFn);
  }
  effectFn.deps.length = 0;
}
function track(target, key) {
  if (!activeEffect) return;
  let depsMap = bucket.get(target);
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}
function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  const effectsToRun = new Set(effects);
  effectsToRun && effectsToRun.forEach((fn) => fn());
}
