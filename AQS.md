> 首先复习下前置知识
## 一、可重入锁
### 概念
**可重入锁（也叫做递归锁**）指的是同一线程外层函数获得锁之后，内层递归函数仍然能获取该锁的代码，**在同一个线程在外层方法获取锁的时候，在进入内层方法会自动获取锁**
### “可重入锁”这四个字分开来解释
* 可：可以。
* 重：再次。
* 入：进入
* 锁：同步锁
* 进入什么 ----- 进入同步域（即同步代码块/方法或显式锁锁定的代码）
**一个线程中的多个流程可以获取同一把锁，持有这把同步锁可以再次进入。自己可以获取自己的内部锁**
### 可重入锁种类
#### 隐式锁（即synchronized关键字使用的锁）默认是可重入锁
1、用同步块方式实现隐式锁
```java
package juc;

/*
可重入锁:可重复可递归调用的锁，在外层使用锁之后，在内层仍然可以使用，并且不发生死锁，这样的锁就叫做可重入锁。
在一个synchronized修饰的方法或代码块的内部调用本类的其他synchronized修饰的方法或代码块时，是永远可以得到锁的

隐式锁（即synchronized关键字使用的锁）默认是可重入锁
 */
public class ReEnterLockDemo {

    // (隐式锁)synchronized 同步代码块可重入演示
    static Object objectLockA = new Object();

    public static void m1() {
        new Thread(() -> {
            synchronized (objectLockA) {
                System.out.println(Thread.currentThread().getName() + "\t" + "------外层调用");
                synchronized (objectLockA) {
                    System.out.println(Thread.currentThread().getName() + "\t" + "------中层调用");
                    synchronized (objectLockA) {
                        System.out.println(Thread.currentThread().getName() + "\t" + "------内层调用");
                    }
                }
            }
        }, "t1").start();

    }

    public static void main(String[] args) {
        m1();
    }
}
```

![2.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ff2ff899d07f45a6bada939b3f9bfd36~tplv-k3u1fbpfcp-watermark.image?)
2、用同步方法方式实现隐式锁
```java
package juc;

public class StaticReEnterLockDemo {
    // synchronized 同步方法可重入演示

    public synchronized void m1() {
        System.out.println("=====外层");
        m2();
    }

    public synchronized void m2() {
        System.out.println("=====中层");
        m3();
    }

    public synchronized void m3() {
        System.out.println("=====内层");
    }


    public static void main(String[] args) {
        new ReEnterLockDemo().m1();
    }
}
```

![2.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cb6e59061e8248cfb6f3c3c3819c75a0~tplv-k3u1fbpfcp-watermark.image?)
### Synchronized的重入的实现机理
* 每个锁对象拥有一个锁计数器和一个指向持有该锁的线程的指针。
* 当执行`monitorenter`时，如果目标锋对象的计数器为零，那么说明它没有被其他线程所持有，Java虚拟机会将该锁对象的持有线程设置为当前线程，并且将其计数器加`i`。
* 在目标锁对象的计数器不为零的情况下，如果锁对象的持有线程是当前线程，那么`Java`虚拟机可以将其计数器加1，否则需要等待，直至持有线程释放该锁。
* 当执行`monitorexit`时，`Java`虚拟机则需将锁对象的计数器减1。计数器为零代表锁已被释放。
用`javap`指令查看以下代码字节码可发现
```java
static Object objectLockA = new Object();
public static void m1() {
    synchronized (objectLockA){
        System.out.println("lock");
    }
}
```

![4.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/57f1ac6ff6b048499a234722e3956177~tplv-k3u1fbpfcp-watermark.image?)
`monitorenter` 对应上锁，`monitorexit` 对应解锁
**为什么会多出来一个 `monitorexit` 指令呢？**

如果同步代码块中出现`Exception`或者`Error`，则会调用第二个`monitorexit`指令来保证释放锁
### 显式锁（即Lock）也有ReentrantLock这样的可重入锁。
```java
package juc;

import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class LockDemo {

    // ReentrantLock（显示锁） 可重入演示
    static Lock lock = new ReentrantLock();

    public static void main(String[] args) {
        new Thread(() -> {
            lock.lock();
            try {
                System.out.println("=======外层");
                lock.lock();
                try {
                    System.out.println("=======内层");
                } finally {
                    lock.unlock();
                }
            } finally {
                //实现加锁次数和释放次数不一样
                //由于加锁次数和释放次数不一样，第二个线程始终无法获取到锁，导致一直在等待。
                lock.unlock();    //正常情况，加锁几次就要解锁几次
            }
        }, "t1").start();

        new Thread(() -> {
            lock.lock();
            try {
                System.out.println("b thread----外层调用lock");
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                lock.unlock();
            }
        }, "t2").start();
    }
}
```
正常打印
```
=======外层
=======内层
b thread----外层调用lock
```
当我们把`a`线程线程第二个`unlock`注释起来，就会发现`b`线程将会一直阻塞,线程a加了两次锁，而只释放一次锁，所以线程b就拿不到锁。
![3.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/05ee41279be44eafbb5648354e29f788~tplv-k3u1fbpfcp-watermark.image?)


## 二、LockSupport
![5.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/10579669c0b24dc9a28421498a745baa~tplv-k3u1fbpfcp-watermark.image?)
### LockSupport概念
官方解释
![5.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/264f7490285b4ba98a9f391cffc96d9a~tplv-k3u1fbpfcp-watermark.image?)
**重点**：`LockSupport`是用来**创建锁和其他同步类的基本线程阻塞原语**。

下面这句话，后面详细说
`LockSupport`中的`park()`和`unpark()`的作用分别是阻塞线程和解除阻塞线程

**看一道面试题**
### 线程中断
#### 概念
* 一个线程不应该由其他线程来强制中断或停止,而是应该由线程自己自行停止,所以,`Thread.stop`、`Thread.suspend`、`Thread. resume`都已经被废弃了

* 在`Java`中没有办法立即停止一条线程,然而停止线程却显得尤为重要,如取消一个耗时操作。因此,`Java`提供了一种用于停止线程的机制 — 中断

* 中断只是一种协作机制,`Java`没有给**中断增加任何语法,中断的过程完全需要程序员自己实现**

* 若要中断一个线程,你需要手动调用该线程的`interrupt`方法,**该方法也仅仅是将线程对象的中断标识设为`true`**

* 每个线程对象中都有一个标识,用于标识线程是否被中断;该标识位为`true`表示中断,为`false`表示未中断;通过调用线程对象的`interrupt`方法将线程的标识位设为`true`;**可以在别的线程中调用,也可以在自己的线程中调用**

```java
Class Thread:
    /*
    Interrupts this thread.
    Unless the current thread is interrupting itself, which is always permitted, the checkAccess method of this thread is invoked, which may cause a SecurityException to be thrown.
    如果这个线程因为wait()、join()、sleep()方法在用的过程中被打断(interupt),会抛出Interrupte dException
    If this thread is blocked in an invocation of the wait(), wait(long), or wait(long, int) methods of the Object class, or of the join(), join(long), join(long, int), sleep(long), or sleep(long, int), methods of this class, then its interrupt status will be cleared and it will receive an InterruptedException.
    If this thread is blocked in an I/O operation upon an InterruptibleChannel then the channel will be closed, the thread's interrupt status will be set, and the thread will receive a java.nio.channels.ClosedByInterruptException.
    If this thread is blocked in a java.nio.channels.Selector then the thread's interrupt status will be set and it will return immediately from the selection operation, possibly with a non-zero value, just as if the selector's wakeup method were invoked.
    If none of the previous conditions hold then this thread's interrupt status will be set.
    Interrupting a thread that is not alive need not have any effect.
    Throws:
    SecurityException – if the current thread cannot modify this thread
    */
    public void interrupt() {
        if (this != Thread.currentThread())
            checkAccess();

        synchronized (blockerLock) {
            Interruptible b = blocker;
            if (b != null) {
                interrupt0();           // Just to set the interrupt flag
                b.interrupt(this);
                return;
            }
        }
        interrupt0();
    }

    // 调用本地方法（仅仅是设置线程的中断状态未true,不会停止线程）
    private native void interrupt0();
```
![6.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fa34088853e940c3ba8bf6908d96becd~tplv-k3u1fbpfcp-watermark.image?)
### 3种线程等待唤醒的方法
既然提到了线程等待与唤醒，我们就来复习下前面的两种方式。
#### Object类中的wait和notify方法实现线程等待和唤醒
```java
package locksupport;

public class WaitNotifyDemo {
    static Object objectLock = new Object();

    /*
    异常情况一：不在 synchronized 关键字中使用 wait() 和 notify() 方法
    异常情况二：先 notify() 后 wait()
     */

    public static void main(String[] args) {
        new Thread(() -> {
            synchronized (objectLock) {
                System.out.println(Thread.currentThread().getName() + "\t" + "------come in");
                try {
                    objectLock.wait(); // 等待
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                System.out.println(Thread.currentThread().getName() + "\t" + "------被唤醒");
            }
        }, "A").start();

        new Thread(() -> {
            synchronized (objectLock) {
                objectLock.notify(); // 唤醒
                System.out.println(Thread.currentThread().getName() + "\t" + "------通知");
            }
        }, "B").start();
    }


    /**
     * 判断当前线程是否被中断(通过检查中断标识位) 实例方法
     * Tests whether this thread has been interrupted.  The <i>interrupted
     * status</i> of the thread is unaffected by this method.
     *
     * <p>A thread interruption ignored because a thread was not alive
     * at the time of the interrupt will be reflected by this method
     * returning false.
     *
     * @return  <code>true</code> if this thread has been interrupted;
     *          <code>false</code> otherwise.
     * @see     #interrupted()
     * @revised 6.0
     */
    public boolean isInterrupted() {
        return isInterrupted(false);
    }

    /**
     * Tests if some Thread has been interrupted.  The interrupted state
     * is reset or not based on the value of ClearInterrupted that is
     * passed.
     */
    private native boolean isInterrupted(boolean ClearInterrupted);


   
    /**
     *   判断线程是否被中断,并清楚当前中断状态,这个方法做了两件事\
     * (返回当前线程的中断状态 | 将当前线程的中断状态设为false)
     * Tests whether the current thread has been interrupted.  The
     * <i>interrupted status</i> of the thread is cleared by this method.  In
     * other words, if this method were to be called twice in succession, the
     * second call would return false (unless the current thread were
     * interrupted again, after the first call had cleared its interrupted
     * status and before the second call had examined it).
     *
     * <p>A thread interruption ignored because a thread was not alive
     * at the time of the interrupt will be reflected by this method
     * returning false.
     *
     * @return  <code>true</code> if the current thread has been interrupted;
     *          <code>false</code> otherwise.
     * @see #isInterrupted()
     * @revised 6.0
     */
    public static boolean interrupted() {
        return currentThread().isInterrupted(true);
    }

}
```

![7.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e48bced9df374b5eae819d9c8b411604~tplv-k3u1fbpfcp-watermark.image?)
这样执行**先阻塞后唤醒**的话并没有错，下面我们演示**不在 synchronized 关键字中使用 wait() 和 notify() 方法**。
#### wait方法和notify方法，两个都去掉同步代码块
```java
// synchronized (objectLock) 
```
#### 使用中断标识停止线程
-   在需要中断的线程中不断监听中断状态,一旦发生中断,就执行型对于的中断处理业务逻辑
-   三种中断标识停止线程的方式
**通过Thread类自带的中断API方法实现**
```java
private static void m1() {
    Thread t1 = new Thread(() -> {
        while (true) {
            if (Thread.currentThread().isInterrupted()) {
                System.out.println("-----isInterrupted() = true,程序结束。");
                break;
            }
            System.out.println("------ Interrupt");
        }
    }, "input");
    t1.start();

    // 暂停一会线程
    try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }

    new Thread(() -> {
        t1.interrupt();//修改t1线程的中断标志位为true
    },"t2").start();
}
```
**通过volatile变量实现**
```java
public static void m3(){
    new Thread(() -> {
        while(true)
        {
            if(isStop)
            {
                System.out.println("-----isStop = true,程序结束。");
                break;
            }
            System.out.println("------isStop Interrupting");
        }
    },"t1").start();

    //暂停几秒钟线程
    try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }

    new Thread(() -> {
        isStop = true;
    },"t2").start();
}
```
**通过AtomicBoolean**
```java
public static void m2(){
    new Thread(() -> {
        while(true)
        {
            if(atomicBoolean.get())
            {
                System.out.println("-----atomicBoolean.get() = true,程序结束。");
                break;
            }
            System.out.println("------atomicBoolean Interrupting");
        }
    },"t1").start();

    //暂停几秒钟线程
    try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }

    new Thread(() -> {
        atomicBoolean.set(true);
    },"t2").start();
}
```
**中断为true后,并不是立刻stop程序**
看下面案例
```java
public static void m4() {
    //中断为true后,并不是立刻stop程序
    Thread t1 = new Thread(() -> {
        for (int i = 1; i <= 300; i++) {
            System.out.println("------i: " + i);
        }
        System.out.println("t1.interrupt()调用之后02: " + Thread.currentThread().isInterrupted());
    }, "t1");
    t1.start();

    System.out.println("t1.interrupt()调用之前,t1线程的中断标识默认值: " + t1.isInterrupted());
    try {
        TimeUnit.MILLISECONDS.sleep(3);
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
    //实例方法interrupt()仅仅是设置线程的中断状态位设置为true,不会停止线程
    t1.interrupt();
    //活动状态,t1线程还在执行中
    System.out.println("t1.interrupt()调用之后01: " + t1.isInterrupted());

    try {
        TimeUnit.MILLISECONDS.sleep(3000);
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
    //非活动状态,t1线程不在执行中,已经结束执行了。
    System.out.println("t1.interrupt()调用之后03: " + t1.isInterrupted());
}
```

![9.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/19864d8ff9d749c4ac172e4c45ba46e3~tplv-k3u1fbpfcp-watermark.image?)
#### 将notify放在wait方法前面
下面我们延迟A进程，让唤醒方法先被执行看会发生什么。
```java
public static void main(String[] args) {
    new Thread(() -> {
        // 暂停一会线程
        try { TimeUnit.SECONDS.sleep(3); } catch (InterruptedException e) { e.printStackTrace(); }
        synchronized (objectLock) {
            System.out.println(Thread.currentThread().getName() + "\t" + "------come in");
            try {
                objectLock.wait(); // 等待
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            System.out.println(Thread.currentThread().getName() + "\t" + "------被唤醒");
        }
    }, "A").start();

    new Thread(() -> {
        synchronized (objectLock) {
            objectLock.notify(); // 唤醒
            System.out.println(Thread.currentThread().getName() + "\t" + "------通知");
        }
    }, "B").start();
}
```

![8.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ee6f09f278bc46cbb15a2031d2dce48e~tplv-k3u1fbpfcp-watermark.image?)
可以看出会一直阻塞。
### Condition接口中的await后signal方法实现线程的等待和唤醒
```java
package locksupport;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class AwaitSignalDemo {
    /*
    异常情况一：不在 lock() 和 unlock() 方法内使用 await() 和 signal() 方法
    异常情况二：先 signal() 后 await()
     */
    static Lock lock = new ReentrantLock();
    static Condition condition = lock.newCondition();

    public static void main(String[] args) {
        new Thread(() -> {
            // 暂停一会线程
//            try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }
            lock.lock();
            try {
                System.out.println(Thread.currentThread().getName() + "\t" + "------come in");
                try {
                    condition.await();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                System.out.println(Thread.currentThread().getName() + "\t" + "------被唤醒");
            } finally {
                lock.unlock();
            }
        }, "A").start();


        new Thread(() -> {
            lock.lock();
            try {
                condition.signal();
                System.out.println(Thread.currentThread().getName() + "\t" + "------通知");
            } finally {
                lock.unlock();
            }
        }, "B").start();
    }

}
```

![7.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/88eb9ae2e29a48508eb6d1aec936a88e~tplv-k3u1fbpfcp-watermark.image?)
A 线程先执行，执行 `condition.await()` 后被阻塞，B 线程在 A 线程之后执行 `condition.signal()` 将 A线程唤醒
#### 去掉 lock() 和 unlock() 方法
下面来看注释掉**lock() 和 unlock()**
```java
//lock.lock();
//lock.unlock();
```

![10.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5abca4d654754effb2dc0da78f19ca50~tplv-k3u1fbpfcp-watermark.image?)

#### 先 signal() 后 await()
下面我们延迟A进程，让唤醒方法先被执行看会发生什么。
```java
public static void main(String[] args) {
    new Thread(() -> {
        // 暂停一会线程
        try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }
        lock.lock();
        try {
            System.out.println(Thread.currentThread().getName() + "\t" + "------come in");
            try {
                condition.await();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            System.out.println(Thread.currentThread().getName() + "\t" + "------被唤醒");
        } finally {
            lock.unlock();
        }
    }, "A").start();
```

![8.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e341ba7140c44a44a9c53f378dc3e7ec~tplv-k3u1fbpfcp-watermark.image?)
与`Object`锁情况相似。
### 传统的synchronized和Lock实现等待唤醒通知的约束
* 线程先要获得并持有锁，必须在锁块（synchronized或lock）中
* 必须要先等待后唤醒，线程才能够被唤醒
### LockSupport类中的park等待和unpark唤醒
* `LockSupport`是用来创建锁和其他同步类的基本线程阻塞原语。
* `LockSupport`类使用了一种名为`Permit`(许可）的概念来做到阻塞和唤醒线程的功能，每个线程都有一个许可(`permit`),`permit`只有两个值1和零，默认是零。
* 可以把许可看成是一种(0,1)信号量(`Semaphore`），但与`Semaphore`不同的是，许可的累加上限是1。
#### park
`park()/park(Object blocker)`

`park()` 方法的作用：阻塞当前线程/阻塞传入的具体线程

`permit` 默认是 0，所以一开始调用 `park()` 方法，当前线程就会阻塞，直到别的线程将当前线程的 `permit` 设置为 1 时，`park()` 方法会被唤醒，然后会将 `permit` 再次设置为 0 并返回。

`park()` 方法通过 `Unsafe` 类实现

```java
// Disables the current thread for thread scheduling purposes unless the permit is available.
public static void park() {
    UNSAFE.park(false, 0L);
}
```
#### unpark
`unpark(Thread thread)`

`unpark()` 方法的作用：唤醒处于阻断状态的指定线程

调用 `unpark(thread)` 方法后，就会将 `thread` 线程的许可 `permit` 设置成 1（注意多次调用 `unpark()`方法，不会累加，`permit` 值还是 1），这会自动唤醒 `thread `线程，即之前阻塞中的`LockSupport.park()`方法会立即返回。

`unpark()`方法通过 `Unsafe` 类实现
```java
// Makes available the permit for the given thread
public static void unpark(Thread thread) {
    if (thread != null)
        UNSAFE.unpark(thread);
}
```
#### 下面用LockSupport实现线程的阻塞和唤醒
```java
private static void lockSupportParkUnpark() {
    Thread a = new Thread(() -> {
        System.out.println(Thread.currentThread().getName() + "\t" + "------come in");
        LockSupport.park(); // 线程 A 阻塞
        System.out.println(Thread.currentThread().getName() + "\t" + "------被唤醒");
    }, "A");
    a.start();

    new Thread(() -> {
        LockSupport.unpark(a); // B 线程唤醒线程 A
        System.out.println(Thread.currentThread().getName() + "\t" + "------通知");
    }, "B").start();
}
```
**运行结果**：A 线程先执行 `LockSupport.park()` 方法将通行证（`permit`）设置为 0，permit 初始值本来就为 0，然后 B 线程执行 `LockSupport.unpark(a)` 方法将 `permit` 设置为 1，此时 A 线程可以通行
![support1.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f7e81951b97f4e7cae4d04794f538b91~tplv-k3u1fbpfcp-watermark.image?)

##### 先唤醒再阻塞
延迟 A线程，让B线程的唤醒先执行
```java
Thread a = new Thread(() -> {
    // 暂停一会线程
    try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }
    System.out.println(Thread.currentThread().getName() + "\t" + "------come in");
    LockSupport.park(); // 线程 A 阻塞
    System.out.println(Thread.currentThread().getName() + "\t" + "------被唤醒");
}, "A");
a.start();
```
**运行结果**：因为引入了通行证的概念，所以先唤醒（`unpark()`）其实并不会有什么影响，从程序运行结果可以看出，A 线程执行 `LockSupport.park()` 时并没有被阻塞
![support2.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d32dca4951dc46e2b25a1825db593a8f~tplv-k3u1fbpfcp-watermark.image?)
##### 虽然上述情况均不会抛异常，但也有异常情况
例如：**没有考虑到 permit 上限值为 1**
```java
private static void lockSupportBlock() {
    Thread a = new Thread(() -> {
        // 暂停一会线程
        try { TimeUnit.SECONDS.sleep(3); } catch (InterruptedException e) { e.printStackTrace(); }
        System.out.println(Thread.currentThread().getName() + "\t" + "------come in" + System.currentTimeMillis());
        LockSupport.park();
        LockSupport.park();
        System.out.println(Thread.currentThread().getName() + "\t" + "------被唤醒" + System.currentTimeMillis());
    }, "A");
    a.start();

    new Thread(() -> {
        LockSupport.unpark(a);
        LockSupport.unpark(a);
        System.out.println(Thread.currentThread().getName() + "\t" + "------通知");
    }, "B").start();
}
```
**结果**:虽然执行两次 `LockSupport.unpark(a)`,但`permit` 上限值为 1,后面两次`LockSupport.park()`只有第一次会通过，第二次仍会阻塞。

![support3.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e366d2789a904a79bf7018284d2a84fb~tplv-k3u1fbpfcp-watermark.image?)
#### LockSupport重点说明
**`LockSupport`是用来创建锁和其他同步类的基本线程阻塞原语**

* `LockSupport`是一个线程阻塞工具类，所有的方法都是静态方法，可以让线程在任意位置阻塞，阻塞之后也有对应的唤醒方法。归根结底，`LockSupport`调用的`Unsafe`中的`native`代码。

**`LockSupport`提供`park()`和`unpark()`方法实现阻塞线程和解除线程阻塞的过程**

* `LockSupport`和每个使用它的线程都有一个许可(`permit`)关联。`permit`相当于1，0的开关，默认是0，

* 调用一次`unpark`就加1变成1，

* 调用一次`park`会消费`permit`，也就是将1变成o，同时`park`立即返回。

* 如再次调用`park`会变成阻塞(因为`permit`为零了会阻塞在这里，一直到`permit`变为1)，这时调用`unpark`会把`permit`置为1。

* 每个线程都有一个相关的`permit`, `permit`最多只有一个，重复调用`unpark`也不会积累凭证。

**形象的理解**

线程阻塞需要消耗凭证(`permit`)，这个凭证最多只有1个。

**当调用park方法时**

* 如果有凭证，则会直接消耗掉这个凭证然后正常退出;

* 如果无凭证，就必须阻塞等待凭证可用;

* 而`unpark`则相反，它会增加一个凭证，但凭证最多只能有1个，累加无效。
#### 相关面试题
**为什么可以先唤醒线程后阻塞线程?**

因为unpark获得了一个凭证，之后再调用park方法，就可以名正言顺的凭证消费，故不会阻塞。


**为什么唤醒两次后阻塞两次，但最终结果还会阻塞线程?**

因为凭证的数量最多为1，连续调用两次unpark和调用一次unpark效果一样，只会增加一个凭证;

而调用两次park却需要消费两个凭证，证不够，不能放行。
## AbstractQueuedSynchronizer
### 概念
字面意思为抽象的队列同步器。

一般我们说的 `AQS` 指的是 `java.util.concurrent.locks` 包下的 `AbstractQueuedSynchronizer`，但其实还有另外两种种抽象队列同步器：`AbstractOwnableSynchronizer`、`AbstractQueuedLongSynchronizer` 

![aqs1.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1e1e00e096434172a8db09ff06ced979~tplv-k3u1fbpfcp-watermark.image?)
```
/*
    A synchronizer that may be exclusively owned by a thread. This class 
    provides a basis for creating locks and related synchronizers that may 
    entail a notion of ownership. The AbstractOwnableSynchronizer class itself does not manage or use this information. However, subclasses and 
    tools may use appropriately maintained values to help control and 
    monitor access and provide diagnostics.
*/
public abstract class AbstractOwnableSynchronizer
    implements java.io.Serializable 
```
> 该父类本身不管理或使用此信息。但是，子类和工具可以使用适当维护的值来帮助控制和监视访问并提供诊断。
> **技术翻译**\
> 是用来构建锁或者其它同步器组件的**重量级基础框架及整个JUC体系的基石**， 通过内置的**FIFO队列来完成资源获取线程的排队工作**，并通过一个int类变量 表示持有锁的状态

![aqs2.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7f7bc9d5f59248f2bbbd4bcf732474a8~tplv-k3u1fbpfcp-watermark.image?)
### AQS为什么是JUC内容中最重要的基石

![aqs3.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7cfd8d79aa0546df9e434c2e66706302~tplv-k3u1fbpfcp-watermark.image?)

![aqs5.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bc548d67dac64292b1cdb282849f875e~tplv-k3u1fbpfcp-watermark.image?)

![aqs6.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dbd028bda00a4feb8da0e1898ed9863b~tplv-k3u1fbpfcp-watermark.image?)

![aqs7.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/de377629b3c8497e9ccb50f861df6f6e~tplv-k3u1fbpfcp-watermark.image?)
### 进一步理解锁和同步器的关系
**锁，面向锁的使用者**——定义了程序员和锁交互的使用层API，隐藏了实现细节，你调用即可。
**同步器，面向锁的实现者**——比如Java并发大神Douglee，提出统一规 范并简化了锁的实现，屏蔽了同步状态管理、阻塞线程排队和通知、唤醒机制等。
### AQS作用
**加锁会导致阻塞**————有阻塞就需要排队，实现排队必然需要有某种形式的队列来进行管理

抢到资源的线程直接使用办理业务，抢占不到资源的线程的必然涉及**一种排队等候机制**，抢占资源失败的线程继续去等待(类似办理窗口都满了，暂时没有受理窗口的顾客只能去候客区排队等候)，仍然保留获取锁的可能且获取锁流程仍在继续(候客区的顾客也在等着叫号，轮到了再去受理窗口办理业务）。

**既然说到了排队等候机制，那么就一定 会有某种队列形成，这样的队列是什么数据结构呢?**

如果共享资源被占用，就需要一定的**阻塞等待唤醒机制来保证锁分配**。这个机制主要用的是`CLH`队列的变体实现的，将暂时获取不到锁的线程加入到队列中，这个队列就是`AQS`的抽象表现。它将请求共享资源的线程封装成队列的结点`(Node`) ，通过`CAS`、自旋以及`LockSuport.park()`的方式，维护`state`变量的状态，使并发达到同步的效果。

![aqs2.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5d1debba750f46bbb1ef9fc2027f5fa3~tplv-k3u1fbpfcp-watermark.image?)
### AQS初识

![aqs8.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b15b820216df4f488a7224c7b169d520~tplv-k3u1fbpfcp-watermark.image?)
**有阻塞就需要排队，实现排队必然需要队列**\
`AQS`使用一个`volatile`的`int`类型的成员变量来表示**同步状态**，通过内置的 `FIFO`队列来完成资源获取的排队工作将每条要去抢占资源的线程封装成 一个`Node`节点来实现锁的分配，通过`CAS`完成对`State`值的修改。

![aqs9.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d519274707d645d58ee97a3ad96799df~tplv-k3u1fbpfcp-watermark.image?)
### AQS内部体系架构
#### AQS自身
![aqs10.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/02e62f4e28924a1584f54436cf0a4dac~tplv-k3u1fbpfcp-watermark.image?)
AQS的int变量
**AQS的同步状态State成员变量**
```java
/**
* The synchronization state.
*/
private volatile int state;
```
类似银行办理业务的受理窗口状态
* 零就是没人，自由状态可以办理
* 大于等于1，有人占用窗口，等着去
**AQS的CLH队列**
`CLH`队列（三个大牛的名字组成），为一个**双向队列**，类似银行侯客区的等待顾客
![aqs11.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d2d9210a57b54b31b1f8c2f1bc4bf4fb~tplv-k3u1fbpfcp-watermark.image?)
**小结**
* 有阻塞就需要排队，实现排队必然需要队列
* state变量+CLH双端Node队列
#### 内部类Node（Node类在AQS类内部）
**Node的int变量**
Node的等待状态waitState成员变量
```java
/**
 * Status field, taking on only the values:
 *   SIGNAL:     The successor of this node is (or will soon be)
 *               blocked (via park), so the current node must
 *               unpark its successor when it releases or
 *               cancels. To avoid races, acquire methods must
 *               first indicate they need a signal,
 *               then retry the atomic acquire, and then,
 *               on failure, block.
 *   CANCELLED:  This node is cancelled due to timeout or interrupt.
 *               Nodes never leave this state. In particular,
 *               a thread with cancelled node never again blocks.
 *   CONDITION:  This node is currently on a condition queue.
 *               It will not be used as a sync queue node
 *               until transferred, at which time the status
 *               will be set to 0. (Use of this value here has
 *               nothing to do with the other uses of the
 *               field, but simplifies mechanics.)
 *   PROPAGATE:  A releaseShared should be propagated to other
 *               nodes. This is set (for head node only) in
 *               doReleaseShared to ensure propagation
 *               continues, even if other operations have
 *               since intervened.
 *   0:          None of the above
 *
 * The values are arranged numerically to simplify use.
 * Non-negative values mean that a node doesn't need to
 * signal. So, most code doesn't need to check for particular
 * values, just for sign.
 *
 * The field is initialized to 0 for normal sync nodes, and
 * CONDITION for condition nodes.  It is modified using CAS
 * (or when possible, unconditional volatile writes).
 */
volatile int waitStatus;
```
类似等候区其它顾客(其它线程)的等待状态，队列中每个排队的个体就是一个Node.
**Node此类的讲解**
内部结构+属性说明
```java
static final class Node{
    //共享
    static final Node SHARED = new Node();
    
    //独占
    static final Node EXCLUSIVE = null;
    
    //线程被取消了
    static final int CANCELLED = 1;
    
    //后继线程需要唤醒
    static final int SIGNAL = -1;
    
    //等待condition唤醒
    static final int CONDITION = -2;
    
    //共享式同步状态获取将会无条件地传播下去
    static final int PROPAGATE = -3;
    
    // 初始为e，状态是上面的几种
    volatile int waitStatus;
    
    // 前置节点
    volatile Node prev;
    
    // 后继节点
    volatile Node next;

    // ...
    
```
### AQS同步队列的基本结构

![a1.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/030ea07b4de44cfcba0070790ba8c1cb~tplv-k3u1fbpfcp-watermark.image?)
### AQS底层是怎么排队的？
是用`LockSupport.pork()`来进行排队的
## 从我们的ReentrantLock开始解读AQS
`ReentrantLock` 类是`Lock`接口的实现类，基本都是通过【聚合】了一个【队列同步器】的子类完成线程访问控制的
### ReentrantLock原理
`ReentrantLock` 实现了 Lock 接口，在 `ReentrantLock` 内部聚合了一个 `AbstractQueuedSynchronizer` 的实现类

![aqs12.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5ce65a5da0264f1099785300471e56d7~tplv-k3u1fbpfcp-watermark.image?)
### 从最简单的lock方法开始看看公平和非公平
在 `ReentrantLock` 内定义了静态内部类，分别为 `NoFairSync`（非公平锁）和 `FairSync`（公平锁）

![aqs14.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d60a3b7a0f95496f9548523cccd7f56e~tplv-k3u1fbpfcp-watermark.image?)
    `ReentrantLock` 的构造函数：不传参数表示创建非公平锁；参数为 true 表示创建公平锁；参数为 `false` 表示创建非公平锁
```
public ReentrantLock(boolean fair) {
    sync = fair ? new FairSync() : new NonfairSync();
}
```
![aqs13.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e97ac87a697c47f1bc71534b5e4df266~tplv-k3u1fbpfcp-watermark.image?)
可以明显看出公平锁与非公平锁的lock()方法唯一的区别就在于公平锁在获取同步状态时多了一个限制条件:`hasQueuedPredecessors()`、`hasQueuedPredecessors`是公平锁加锁时判断等待队列中是否存在有效节点的方法
对比公平锁和非公平锁的tryAcqure()方法的实现代码， 其实差别就在于非公平锁获取锁时比公平锁中少了一个判断!hasQueuedPredecessors()，hasQueuedPredecessors()中判断了是否需要排队，导致公平锁和非公平锁的差异如下:\
### 公平锁与非公平锁区别
公平锁：公平锁讲究先来先到，线程在获取锁时，如果这个锁的等待队列中已经有线程在等待，那么当前线程就会进入等待队列中；

非公平锁：不管是否有等待队列，如果可以获取锁，则立刻占有锁对象。也就是说队列的第一 个排队线程在unpark()，之后还是需要竞争锁(存在线程竞争的情况下)

![aqs15.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ea1f5e62cf9f43b9955259e9ef5d0714~tplv-k3u1fbpfcp-watermark.image?)
**我们以NonfairSync举例来看源码**
```java
ReentrantLock lock = new ReentrantLock(true);
lock.lock();
```

```java
public void lock() {
    sync.lock();
}
```
`Sync`是`ReentrantLock`一个静态内部类并继承`AbstractQueuedSynchronizer`,
抽象方法`lock()`我们需要去子类看怎么实现
```java
abstract static class Sync extends AbstractQueuedSynchronizer {
    private static final long serialVersionUID = -5179523762034025860L;

    /**
     * Performs {@link Lock#lock}. The main reason for subclassing
     * is to allow fast path for nonfair version.
     */
    abstract void lock();

    /**
     * Performs non-fair tryLock.  tryAcquire is implemented in
     * subclasses, but both need nonfair try for trylock method.
     */
    final boolean nonfairTryAcquire(int acquires) {
        final Thread current = Thread.currentThread();
        int c = getState();
        if (c == 0) {
            if (compareAndSetState(0, acquires)) {
                setExclusiveOwnerThread(current);
                return true;
            }
        }
        else if (current == getExclusiveOwnerThread()) {
            int nextc = c + acquires;
            if (nextc < 0) // overflow
                throw new Error("Maximum lock count exceeded");
            setState(nextc);
            return true;
        }
        return false;
    }

    protected final boolean tryRelease(int releases) {
        int c = getState() - releases;
        if (Thread.currentThread() != getExclusiveOwnerThread())
            throw new IllegalMonitorStateException();
        boolean free = false;
        if (c == 0) {
            free = true;
            setExclusiveOwnerThread(null);
        }
        setState(c);
        return free;
    }

    protected final boolean isHeldExclusively() {
        // While we must in general read state before owner,
        // we don't need to do so to check if current thread is owner
        return getExclusiveOwnerThread() == Thread.currentThread();
    }

    final ConditionObject newCondition() {
        return new ConditionObject();
    }

    // Methods relayed from outer class

    final Thread getOwner() {
        return getState() == 0 ? null : getExclusiveOwnerThread();
    }

    final int getHoldCount() {
        return isHeldExclusively() ? getState() : 0;
    }

    final boolean isLocked() {
        return getState() != 0;
    }

    /**
     * Reconstitutes the instance from a stream (that is, deserializes it).
     */
    private void readObject(java.io.ObjectInputStream s)
        throws java.io.IOException, ClassNotFoundException {
        s.defaultReadObject();
        setState(0); // reset to unlocked state
    }
}
```
同样静态内部类`NonfairSync`又继承静态内部类`Sync`
```
Class ReentrantLock：
    static final class NonfairSync extends Sync {
        private static final long serialVersionUID = 7316153563782823691L;

        /**
         * Performs lock.  Try immediate barge, backing up to normal
         * acquire on failure.
         */
        final void lock() {
            // state为 0 才能通行，我们先判断 state 值，运用 cas比较并交换思想
            if (compareAndSetState(0, 1))
                // 该方法由抽象同步器父类AbstractOwnableSynchronizer持有
                // 线程抢占锁
                setExclusiveOwnerThread(Thread.currentThread());
            else
                // 来自AbstractQueuedSynchronizer中方法
                // 第二线程及后续抢占
                acquire(1);
        }

        // 实现父类的 tryAcquire
        protected final boolean tryAcquire(int acquires) {
            return nonfairTryAcquire(acquires);
        }
    }
    
    
    final boolean nonfairTryAcquire(int acquires) {
        final Thread current = Thread.currentThread();
        int c = getState();
        // state = 0 没人抢占
        // 比如 A 刚走，B 就来了
        if (c == 0) {
            if (compareAndSetState(0, acquires)) {
                // 设置当前受理窗口线程(比如 A 刚走，B 就来了,这里就是B)
                setExclusiveOwnerThread(current);
                return true;
            }
        }
        // 比如银行办理业务，A 在办理业务，受理窗口为 A,当前线程 current 为 B
        // A 线程刚走 B 还没来得及 进去，A 就占用两次，当前判断为 true，可重入锁可以进去多次
        else if (current == getExclusiveOwnerThread()) {
            int nextc = c + acquires;
            if (nextc < 0) // overflow
                throw new Error("Maximum lock count exceeded");
                // 可重入
            setState(nextc);
            return true;
        }
        // 受理窗口为 A,当前线程 current 为 B，返回 false
        return false;
    }

}
```

```java
public abstract class AbstractOwnableSynchronizer
    implements java.io.Serializable {
    // 独占模式同步的当前所有者
    private transient Thread exclusiveOwnerThread;

    // 设置当前受理窗口线程
    protected final void setExclusiveOwnerThread(Thread thread) {
        exclusiveOwnerThread = thread;
    }
    
    // 返回当前受理窗口线程
    protected final Thread getExclusiveOwnerThread() {
        return exclusiveOwnerThread;
    }

}
```

```java
public abstract class AbstractQueuedSynchronizer
    extends AbstractOwnableSynchronizer implements java.io.Serializable {
    
    // 还以银行案例，A 在办理，当前线程就为 B
    private Node addWaiter(Node mode) {
        // 当前顾客就去候客区入队
        Node node = new Node(Thread.currentThread(), mode);
        // Try the fast path of enq; backup to full enq on failure
        Node pred = tail;
        if (pred != null) {
            node.prev = pred;
            if (compareAndSetTail(pred, node)) {
                pred.next = node;
                return node;
            }
        }
        enq(node);
        return node;
    }

    // 前指针为空，直接入队
    private Node enq(final Node node) {
        for (;;) {
            Node t = tail;
            if (t == null) { // Must initialize
                // 尾指针为null，说明队列为空
                // 初始化，第一个结点 new Node 占位符
                if (compareAndSetHead(new Node()))
                    tail = head;
            } else {
                // tail 不为空 第二次真正入队
                node.prev = t;
                if (compareAndSetTail(t, node)) {
                    t.next = node;
                    return t;
                }
            }
        }
    }

    
    protected final void setState(int newState) {
        state = newState;
    }

    // 说明前面有 arg 个进程正在运行
    public final void acquire(int arg) {
        // 抢不到tryAcquire为false，所以往后走
        if (!tryAcquire(arg) &&
            acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
            selfInterrupt();
    }
    
    // 设计模式中模板方法，必须实现，要不就抛出异常，必须实现底层钩子程序
    protected boolean tryAcquire(int arg) {
        throw new UnsupportedOperationException();
    }

    
    private static boolean shouldParkAfterFailedAcquire(Node pred, Node node) {
        // 等待状态
        int ws = pred.waitStatus;
        // -1
        if (ws == Node.SIGNAL)
            /*
             * This node has already set status asking a release
             * to signal it, so it can safely park.
             */
            return true;
        if (ws > 0) {
            /*
             * Predecessor was cancelled. Skip over predecessors and
             * indicate retry.
             */
            do {
                node.prev = pred = pred.prev;
            } while (pred.waitStatus > 0);
            pred.next = node;
        } else {
            /*
             * waitStatus must be 0 or PROPAGATE.  Indicate that we
             * need a signal, but don't park yet.  Caller will need to
             * retry to make sure it cannot acquire before parking.
             */
             // 从 0 变成 -1
            compareAndSetWaitStatus(pred, ws, Node.SIGNAL);
        }
        return false;
    }

    
    final boolean acquireQueued(final Node node, int arg) {
        // 若 failed 为false说明某个排队的人不想排了
        boolean failed = true;
        try {
            // 是否打断
            boolean interrupted = false;
            // 自旋
            for (;;) {
                // 返回 prev 第一次就是哨兵结点
                final Node p = node.predecessor();
                // 候客区的时不时又抢一次
                if (p == head && tryAcquire(arg)) {
                    setHead(node);
                    p.next = null; // help GC
                    failed = false;
                    return interrupted;
                }
                // 又抢占失败， p 为哨兵，node 头节点
                if (shouldParkAfterFailedAcquire(p, node) &&
                    // 检查是否被中断
                    parkAndCheckInterrupt())
                    interrupted = true;
            } 
        } finally {
            if (failed)
                cancelAcquire(node);
        }
    }
    
    
    private final boolean parkAndCheckInterrupt() {
        // B 这时候被阻塞
        LockSupport.park(this);
        return Thread.interrupted();
    }

    
    final Node predecessor() throws NullPointerException {
        Node p = prev;
        if (p == null)
            throw new NullPointerException();
        else
            return p;
    }

}
```

#### 银行案例
```java
public class AQSDemo {
    public static void main(String[] args) {

        ReentrantLock lock = new ReentrantLock();
        //带入一个银行办理业务的案例来模拟我们的AQS如何进行线程的管理和通知唤醒机制
        //3个线程模拟3个来银行网点，受理窗口办理业务的顾客
        //A顾客就是第一个顾客，此时受理窗口没有任何人，A可以直接去办理
        new Thread(() -> {
            lock.lock();
            try{
                System.out.println("-----A thread come in");
                try { TimeUnit.MINUTES.sleep(3); }catch (Exception e) {e.printStackTrace();}
            }finally {
                lock.unlock();
            }
        },"A").start();

        //第二个顾客，第二个线程---》由于受理业务的窗口只有一个(只能一个线程持有锁)，此时B只能等待，
        //进入候客区
        new Thread(() -> {
            lock.lock();
            try{
                System.out.println("-----B thread come in");
            }finally {
                lock.unlock();
            }
        },"B").start();

        //第三个顾客，第三个线程---》由于受理业务的窗口只有一个(只能一个线程持有锁)，此时C只能等待，
        //进入候客区
        new Thread(() -> {
            lock.lock();
            try{
                System.out.println("-----C thread come in");
            }finally {
                lock.unlock();
            }
        },"C").start();
    }
}
```
**运行状态分析**

![a2.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/942ede142cb14fcdb744fc0c7df2ba42~tplv-k3u1fbpfcp-watermark.image?)
现在该将装着线程 B 的节点放入双端同步队列中，此时 tail 指向了哨兵节点，并不等于 null，因此 `if (t == null)` 不成立，进入 `else` 分支。以尾插法的方式，先将 `node`（装着线程 B 的节点）的 prev 指向之前的 tail，再将 node 设置为尾节点（执行 `compareAndSetTail(t, node)`），最后将 `t.next` 指向 `node`，最后执行 `return t`结束 `for` 循环

![a3.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f4d87fc46f344a188912c04177bdf714~tplv-k3u1fbpfcp-watermark.image?)

![a4.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6920e4b8097248e28befe3fa8f052e90~tplv-k3u1fbpfcp-watermark.image?)

```java
lock.unlock();
```

```java
public void unlock() {
    sync.release(1);
}
```

```java
public final boolean release(int arg) {
    if (tryRelease(arg)) {
        Node h = head;
        if (h != null && h.waitStatus != 0)
            // 唤醒
            unparkSuccessor(h);
        return true;
    }
    return false;
}
```
在 `release()` 方法中获取到的头结点 h 为哨兵节点，`h.waitStatus == -1`，因此执行 CAS操作将哨兵节点的 `waitStatus` 设置为 0，并将哨兵节点的下一个节点（`s = node.next = nodeB`）获取出来，并唤醒 nodeB 中封装的线程（`if (s == null || s.waitStatus > 0`) 不成立，只有 `if (s != null)` 成立）
```java
private void unparkSuccessor(Node node) {
    /*
     * If status is negative (i.e., possibly needing signal) try
     * to clear in anticipation of signalling.  It is OK if this
     * fails or if status is changed by waiting thread.
     */
    int ws = node.waitStatus;
    if (ws < 0)
        compareAndSetWaitStatus(node, ws, 0);

    /*
     * Thread to unpark is held in successor, which is normally
     * just the next node.  But if cancelled or apparently null,
     * traverse backwards from tail to find the actual
     * non-cancelled successor.
     */
    Node s = node.next;
    if (s == null || s.waitStatus > 0) {
        s = null;
        for (Node t = tail; t != null && t != node; t = t.prev)
            if (t.waitStatus <= 0)
                s = t;
    }
    if (s != null)
        LockSupport.unpark(s.thread);
}
```
执行完上述操作后，当前占用 lock 锁的线程为 `null`，哨兵节点的 `waitStatus` 设置为 0，`state` 的值为 0（表示当前没有任何线程占用 lock 锁）
```java
protected boolean tryRelease(int arg) {
    throw new UnsupportedOperationException();
}
```
线程 A 只加锁过一次，因此 `state` 的值为 1，参数 `release` 的值也为 1，因此 `c == 0`。将 `free` 设置为 `true`，表示当前 lock 锁已被释放，将排他锁占有的线程设置为 `null`，表示没有任何线程占用 lock 锁
```java
protected final boolean tryRelease(int releases) {
    int c = getState() - releases;
    if (Thread.currentThread() != getExclusiveOwnerThread())
        throw new IllegalMonitorStateException();
    boolean free = false;
    if (c == 0) {
        free = true;
        // 设置当前窗口占用线程为 null
        setExclusiveOwnerThread(null);
    }
    // 设置 state 为 c（0）
    setState(c);
    return free;
}
```

方法`unlock()`-> `sync.release(1)`-> `tryRelease(arg)`-> `unparkSuccessor`
杀个回马枪：继续来看 B 线程被唤醒之后的执行逻辑.回到上一层方法中，此时 lock 锁未被占用，线程 B 执行 `tryAcquire(arg)` 方法能够抢到 lock 锁，并且将 `state` 变量的值设置为 1，表示该 lock 锁已经被占用

### 总结
#### 考点
**我相信你应该看过源码了，那么AQS里面有个变量叫State，它的值有几种？**

3个状态：没占用是0，占用了是1，大于1是可重入锁

**如果AB两个线程进来了以后，请问这个总共有多少个Node节点？**

3个，分别是哨兵节点、nodeA、nodeB

#### 源码图解

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8ee93a3090a248f7b53a72495a5857db~tplv-k3u1fbpfcp-watermark.image?)

**附上一张全流程**


![ReentrantLock-AQS加锁过程.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d470d0ef50be49ca8c5d50f995f222af~tplv-k3u1fbpfcp-watermark.image?)