let activeEffect;
const effectStack = [];

const bucket = new WeakMap();

export function reactive(data) {
  return new Proxy(data, {
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
}

// 注册effect
export function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    // 执行之前压入栈低 执行副作用函数的时候如果有嵌套的 effect 函数，就不会覆盖掉 activeEffect
    effectStack.push(effectFn);
    fn();
    // 弹栈 返回上一层的 effect 函数
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };
  //利用指针将  effectFn 和 activeEffect 指向同一个 进行依赖收集
  effectFn.deps = [];
  effectFn();
}

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
  // 这里选择一个新的内存来执行依赖函数 防止触发 effect 函数后无限循环
  const effectsToRun = new Set();
  effects &&
    effects.forEach((effectFn) => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn);
      }
    });
  effectsToRun && effectsToRun.forEach((fn) => fn());
}
