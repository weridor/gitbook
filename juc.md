---
theme: smartblue
---
# 大厂面试题JUC专题
## 1.面试真题
## 2.volatile详解
### 2.1、什么是volatile
`volatile`是JVM提供的**轻量级**的同步机制(😆乞丐版synchronized)
1.  保证可见性
1.  不保证原子性
1.  禁止指令重排（保证有序性）
### 2.2、谈谈JMM（内存模型）
*JMM（Java Memory Model，简称JMM*）本身是一种抽象的概念<font color=red>并不真实存在</font>，它描述的是一组规则或规范，**通过这组规范定义了程序中各个变量（包括实例字段，静态字段和构成数组对象的元素）的访问方式**。\
#### 2.2.1、JMM关于同步的规定：
1.  线程解锁前，必须把共享变量的值刷新回主内存
1.  线程加锁前，必须读取主内存的最新值到自己的工作内存
1.  加锁解锁是同一把锁
#### 2.2.2、JMM内存可见性
* 由于JVM运行程序的实体是线程，而每个线程创建时JVM都会为其创建一个工作内存（有些地方称为栈空间），工作内存是每个线程的私有数据区域
* 而Java内存模型中规定所有变量都存储在<font color=red>*主内存*</font>，主内存是共享内存区域，所有线程都可以访问，**但线程对变量的操作（读取赋值等）必须在工作内存中进行，首先要将变量从主内存拷贝的自己的工作内存空间，然后对变量进行操作，操作完成后再将变量写回主内存**，不能直接操作主内存中的变量，各个线程中的工作内存中存储着主内存中的**变量副本拷贝**，因此不同的线程间无法访问对方的工作内存，线程间的通信（传值）必须通过主内存来完成，其简要访问过程如下图

![jmm1.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/74b318673eda4f80bce217594e74a86c~tplv-k3u1fbpfcp-watermark.image?)

![jmm2.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6d542923c8f847e9b539054eb0939a94~tplv-k3u1fbpfcp-watermark.image?)
> 补充：**工作内存是私有区域**，所以工作内存可以对应着JVM运行时数据区的线程私有部分，包括**虚拟机栈，本地方法栈，程序计数器**。\
> **主内存是共享区域**，所以主内存可以对应着JVM运行时数据区的线程共享部分，包括**堆和方法区**。

通过前面对JMM的介绍，我们知道：各个线程对主内存中共享变量的操作都是各个线程各自拷贝到自己的工作内存进行操作后再写回到主内存中的
这就可能存在一个线程AAA修改了共享变量X的值但还未写回主内存时，另外一个线程BBB又对主内存中同一个共享变量X进行操作
*但此时A线程工作内存中的共享变量X对线程B来说并不可见*，这种工作内存与主内存同步延迟现象就造成了**可见性问题**
> JMM保证了可见性、原子性、有序性
### 2.3、可见性的代码验证说明
**验证`volatile`的可见性**
* 加入int number=0，number变量之前根本没有添加volatile关键字修饰，没有可见性
* 添加了volatile，可以解决可见性问题
```
package com.hong.volatiledemo;
import java.util.concurrent.TimeUnit;

/**
 * 假设是主物理内存
 */
class MyData{
    // static 也不支持可见性
//    static int number = 0;
//    int number = 0;
// volatile可以保证可见性，及时通知其它线程主物理内存的值已被修改
    volatile int number = 0;

    public void addT060(){
        this.number = 60;
    }
}

/**
 * 1 验证volatile的可见性
 *         1.1 加入int number=0，number变量之前根本没有添加volatile关键字修饰，没有可见性
 *         1.2 添加了volatile，可以解决可见性问题
 */
public class VolatileDemo {
    public static void main(String[] args) {

        MyData myData = new MyData(); // 资源类

        new Thread(() -> {
            System.out.println(Thread.currentThread().getName()+"\t come in");
//            tsleep
            // 暂停一会线程
            try { TimeUnit.SECONDS.sleep(3); } catch (InterruptedException e) { e.printStackTrace(); }
            myData.addT060();
            System.out.println(Thread.currentThread().getName()+"\t update number value"+myData.number);
            },"AAA").start();

        // 第二个线程就是我们的main线程
        while (myData.number == 0){
            //main线程持有共享数据的拷贝，一直为0
        }
        System.out.println(Thread.currentThread().getName() + "\t mission is over. main get number value: " + myData.number);
    }
}
```
* 由于`AAA`线程先睡眠了3s，所以 main 线程先拿到了`myData.number`的值，将该值拷贝回自己线程的工作内存，此时 myData.number = 0
* `AAA`线程3s后醒来，将`myData.number`拷贝回自己线程的工作内存，修改为 60 后，写回主内存
* 但`AAA`线程将`myData.number`的值写回主内存后，并不会去通知`main`线程。**加上volatile 关键字的，当 AAA 线程修改了 myData.number 的值后，main 线程会受到通知，从而刷新自己线程工作内存中的值**
### 2.4、volatile 不保证原子性
#### 2.4.1、原子性是什么？
**原子性是不可分割，完整性**。也即某个线程正在做某个具体业务时，中间不可以被加塞或者分割， 需要整体完成，**要么同时成功，要么同时失败**（类比数据库原子性）
#### 2.4.2、volatile 不保证原子性的案例演示
```
import java.util.concurrent.TimeUnit;

/**
 * 假设是主物理内存
 */
class MyData{
    // static 也不支持可见性
//    static int number = 0;
//    int number = 0;
    volatile int number = 0;

    public void addT060(){
        this.number = 60;
    }

    //此时number前面已经加了volatile，但是不保证原子性
    // synchronized可以保证
    public void addPlusPlus() {
        number++;
    }

}

public class VolatileDemo {
    public static void main(String[] args) {

        MyData myData = new MyData(); // 资源类

        for (int i = 1; i <= 20; i++) {
            new Thread(() -> {
                for (int j = 0; j < 1000; j++) {
                    myData.addPlusPlus();
                }
            },String.valueOf(i)).start();
        }

        // 需要等待上面线程全部计算完成后，再用main取得最终结果值
        // 默认main和GC
        while (Thread.activeCount() > 2){
            Thread.yield();
        }

        System.out.println(Thread.currentThread().getName() + "\t finally number value: " + myData.number);
}
```
执行发现输出结果并不是20000
#### 2.4.3、volatile不保证原子性理论解释
![jmm3.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/00aa103f944848f0975ee620cfc5652b~tplv-k3u1fbpfcp-watermark.image?)
> 第一步：执行 getfield 指令拿到主内存中 n 的值\
> 第二步：执行 iadd 指令执行加 1 的操作（线程工作内存中的变量副本值加 1）\
> 第三步：执行 putfield 指令将累加后的 n 值写回主内存\
> **iconst_1 是将常量 1 放入操作数栈中，准备执行 iadd 操作**
> 1.  两个线程：线程 A和线程 B ，同时拿到主内存中 n 的值，并且都执行了加 1 的操作
> 1.  线程 A 先执行 putfield 指令将副本的值写回主内存，线程 B 在线程 A 之后也将副本的值写回主内存
### 2.5、volatile不保证原子性问题解决
可加`synchronized`解决，但它是重量级同步机制，性能上有所顾虑。\
如何不加`synchronized`解决`number++`在多线程下是非线程安全的问题？使用**Java.util.concurrent.AtomicInteger**。
```java
AtomicInteger atomicInteger = new AtomicInteger();
public void addAtomic(){
    atomicInteger.getAndIncrement();
}

public static void main(String[] args) {

    MyData myData = new MyData(); // 资源类

    for (int i = 1; i <= 20; i++) {
        new Thread(() -> {
            for (int j = 0; j < 1000; j++) {
                myData.addPlusPlus();
                myData.addAtomic();
            }
        },String.valueOf(i)).start();
    }

    // 需要等待上面线程全部计算完成后，再用main取得最终结果值
    // 默认main和GC
    while (Thread.activeCount() > 2){
        Thread.yield();
    }

    System.out.println(Thread.currentThread().getName() + "\t finally number value: " + myData.number);
    System.out.println(Thread.currentThread().getName() + "\t mission is over. main get number value: " + myData.atomicInteger);
}
```

![jmm5.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/94c05863310348c1b40f547cb7a38865~tplv-k3u1fbpfcp-watermark.image?)
字节码：

![jmm4.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/06e475f531d7406aacbf0b6fac8a9697~tplv-k3u1fbpfcp-watermark.image?)
**AtomicInteger底层源码**
`AtomicInteger`底层和`CAS`底层很相似，都是调用`Unsafe`\
`Unsafe`类是在`sun.misc`包下，不属于Java标准。但是很多Java的基础类库，包括一些被广泛使用的高性能开发库都是基于`Unsafe`类开发的，比如`Netty、Cassandra、Hadoop、Kafka`等。**`Unsafe`类在提升Java运行效率，增强Java语言底层操作能力方面起了很大的作用。**

![ms0.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/58c9657e95a84eaa94475e66f0d74a4f~tplv-k3u1fbpfcp-watermark.image?)
**先获取再修改**
```java
public final int getAndIncrement() {
    return unsafe.getAndAddInt(this, valueOffset, 1);
}
```
**先修改再获取**
```java
public final int incrementAndGet() {
    return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
}
```
### 2.6、volatile禁止指令重排（保证有序性）
计算机在执行程序时，为了提高性能，编译器和处理器的常常会对指令做重排，一般分以下3种：

![ms1.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4ac061ff2b004f67ba38af3919125191~tplv-k3u1fbpfcp-watermark.image?)
**理解指令重排序**
1. 指令重排序，就是出于优化考虑，CPU执行指令的顺序跟程序员自己编写的顺序不一致
2. 就好比一份试卷，题号是老师规定的，是程序员规定的，但是考生（CPU）可以先做选择，也可以先做填空
3. 单线程环境里面可以确保程序最终执行结果和代码顺序执行的结果一致
4. 处理器在进行重排序时必须要考虑指令之间的**数据依赖性**
5. 多线程环境中线程交替执行，由于编译器优化重排的存在，两个线程中使用的变量能否保证一致性是无法确定的，结果无法预测，如下代码
```java
public void mySort{
    int x = 11;//语句1
    int y = 12;//语句2
    × = × + 5;//语句3
    y = x * x;//语句4
}
```
> 可能执行的顺序
> 1234, 2134, 1324
> **案例二**\
> 指令重排的两种结果
> ![ms2.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b4e28a18027043cca8cced0af1819cf4~tplv-k3u1fbpfcp-watermark.image?)
> **案例三**
```java
public class ReSortSeqDemo {
    int a = 0;
    boolean flag = false;

    public void method01(){
        a = 1;              // 语句1
        flag = true;        // 语句2
    }

    public void method02(){
        if (flag){
            a = a + 5;
            System.out.println("retValue:"+a); // 可能是6或1或5或0
        }
    }
}
```
1. 变量 a 与 flag 并没有数据依赖性，所以 a = 1; 与 flag = true; 语句无法保证谁先谁后
2. 线程操作资源类，线程1访问method1，线程2访问method2，正常情况顺序执行，a=6
3. 多线程下假设出现了指令重排，语句2在语句1之前，当执行完flag=true后，另一个线程马上执行method2，则会输出 a=5
> **禁止指令重排小总结**

volatile实现**禁止指令重排优化**，从而避免多线程环境下程序出现乱序执行的现象
先了解一个概念，**内存屏障(Memory Barrier）又称内存栅栏，是一个CPU指令**，它的作用有两个:
* 保证特定操作的执行顺序，
* 保证某些变量的内存可见性（利用该特性实现volatile的内存可见性）。

对volatile变量进行写操作时，会在写操作后加入**一条store屏障指令**，将工作内存中的共享变量值刷新回到主内存。
![ms3.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3f41a8beb8044ff28de6106f597cef9b~tplv-k3u1fbpfcp-watermark.image?)
对Volatile变量进行读操作时，会在读操作前加入**一条load屏障指令**，从主内存中读取共享变量。
![ms4.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9e0a5441b38f4d029b1811e44b1ce611~tplv-k3u1fbpfcp-watermark.image?)
### 2.7、线程安全性保证
**如何使线程安全性获得保证**
* 工作内存与主内存同步延迟现象导致的可见性问题可以使用synchronized或volatile关键字解决，它们都可以使一个线程修改后的变量立即对其他线程可见
* **对于指令重排导致的可见性问题和有序性问题可以利用volatile关键字解决**，因为volatile的另外一个作用就是禁止重排序优化。
### 2.8、你在哪些地方用到过volatile?
####  2.8.1、单例模式
**传统的单例模式在多线程下运行**
```java
package com.hong.volatiledemo;

public class SingletonDemo {

    private static SingletonDemo instance = null;

    private SingletonDemo(){
        System.out.println(Thread.currentThread().getName()+"\t 我是构造方法");
    }

    public static SingletonDemo getInstance(){
        if (instance == null){
            instance = new SingletonDemo();
        }
        return instance;
    }

    public static void main(String[] args) {
        System.out.println(SingletonDemo.getInstance() == SingletonDemo.getInstance());
        System.out.println(SingletonDemo.getInstance() == SingletonDemo.getInstance());
        System.out.println(SingletonDemo.getInstance() == SingletonDemo.getInstance());
        
        for (int i = 1; i <= 10; i++) {
            new Thread(() -> {
                SingletonDemo.getInstance();
            },String.valueOf(i)).start();
        }
    }
}
```

![ms5.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b164be0a5a38477293f308b64fc7c4c0~tplv-k3u1fbpfcp-watermark.image?)
发现在单线程下可以正确运行，可是切换到多线程下，单例模式就失效了。
#### 2.8.2、解决办法synchronized和DCL
解决方法之一：用`synchronized`修饰方法`getInstance()`，但它属重量级同步机制，使用时慎重。
**解决方式二：单例模式DCL（Double Check Lock）**
```java
// DCL（Double Check Lock）
private static SingletonDemo instance = null;

public static SingletonDemo getInstance(){
    if (instance == null){
        synchronized (SingletonDemo.class){
            if (instance == null){
                instance = new SingletonDemo();
            }
        }
    }
    return instance;
}
```
执行结果```1	 我是构造方法```，生效.但该种方式并不一定能保证
> 这种写法在多线程条件下，可能由于指令重排出错
> 原因在于**某一个线程执行到第一次检测，读取到的instance不为null时，instance的引用对象可能没有完成初始化**。instance = new SingletonDemo();可以分为以下3步完成(伪代码)：
```java
1 memory = allocate(); //1.分配对象内存空间
2 instance(memory); //2.初始化对象
3 instance = memory; //3.设置instance指向刚分配的内存地址，此时instance != null
```
步骤2和步骤3不存在数据依赖关系，而且无论重排前还是重排后程序的执行结果在单线程中并没有改变，因此这种重排优化是允许的。
```java
memory = allocate(); //1.分配对象内存空间
instance = memory;//3.设置instance指向刚分配的内存地址，此时instance! =null，但是对象还没有初始化完成!
instance(memory);//2.初始化对象
```
但是指令重排只会保证串行语义的执行的一致性(单线程)，但并不会关心多线程间的语义一致性。\
所以当一条线程访问instance不为null时，由于instance实例未必已初始化完成，也就造成了线程安全问题。
#### 2.8.3、DCL中加volatile避免指令重排
```java
private static SingletonDemo instance = null;
```
## 3、CAS
### 3.1、CAS概述
**CAS：compare and set（比较并交换）**： 底层**自旋锁 + Unsafe 类**
### 3.2、Atomiclnteger
`AtomicInteger` 类中维护了一个 `Unsafe` 实例，和一个 `volatile` 修饰的 value 值
![ms7.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cd931fd0d99946dc801d17e8c2da1f4a~tplv-k3u1fbpfcp-watermark.image?)
```java
public final int getAndIncrement() { return unsafe.getAndAddInt(this, valueOffset, 1); }
```
1.  this：当前对象
1.  valueOffset：**内存偏移量**（内存地址）
1.  为什么AtomicInteger能解决i++多线程下不安全的问题，靠的是底层的**Unsafe类**
### 3.3、Unsafe 类
* `Unsafe`是CAS的核心类，由于Java方法无法直接访问底层系统，需要通过本地（native）方法来访问，`Unsafe`相当于一个后门，基于该类可以直接操作特定内存的数据。
* `Unsafe`类存在于`sun.misc`包中，其内部方法操作可以像C的指针一样直接操作内存，Java中CAS操作的执行依赖于`Unsafe`类的方法。
* **注意`Unsafe`类中的所有方法都是`native`修饰的，也就是说`Unsafe`类中的方法都直接调用操作系统底层资源执行相应在务。**
* **变量`valueOffset`，表示该量值在内存中的偏移地址，因为Unsafe就是根据内存偏移地址获取数据的。**
* 变量value用volatile修饰，保证了多线程之间的内存可见性。
### 3.4、CAS
1. CAS的全称为Compare-And-Swap，它是一条CPU并发原语。
2. 它的功能是判断内存某个位置的值是否为预期值，如果是则更改为新的值，这个过程是原子的。
3. CAS并发原语体现在JAVA语言中就是`sun.misc.Unsafe`类中的各个方法。调用UnSafe类中的CAS方法，JVM会帮我们实现出**CAS汇编指令**。这是一种完全依赖于**硬件**的功能，通过它实现了原子操作。再次强调，由于CAS是一种系统原语，原语属于操作系统用语范畴，是由若干条指令组成的，用于完成某个功能的一个过程，**并且原语的执行必须是连续的，在执行过程中不允许被中断，也就是说CAS是一条CPU的原子指令，不会造成所谓的数据不一致问题。**

![ms8.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f630ce7edc6c469faf648ddfb2c9cb08~tplv-k3u1fbpfcp-watermark.image?)
* `atomicInteger.getAndIncrement()` 方法调用` unsafe.getAndAddInt() `方法
* `this.getIntVolatile(var1,var2)` 方法获取var1这个对象在var2地址上的值
* `this.compareAndSwapInt(var1, var2, var5, var5 + var4) `方法判断 var5 变量是否与期望值相同：
     -  如果 var5 与内存中的期望值相同，证明没有其他线程改过，则执行 +var 操作
     -  如果 var5 与内存中的期望值不同，证明没有其他线程改过 var2 地址处的值，然后再重新获取 var2 地址处的值，重复 compare and set 操作
#### 3.4.1、UnSafe.getAndAddInt()源码解释：
* var1 AtomicInteger对象本身。
* var2 该对象值得引用地址。
* var4 需要变动的数量。
* var5是用过var1，var2找出的主内存中真实的值。
* 用该对象当前的值与var5比较：
* 如果相同，更新var5+var4并且返回true,
* 如果不同，继续取值然后再比较，直到更新完成。
**假设线程A和线程B两个线程同时执行getAndAddInt操作（分别跑在不同CPU上) ：**
1. `Atomiclnteger`里面的value原始值为3，即主内存中`Atomiclnteger`的value为3，根据JMM模型，线程A和线程B各自持有一份值为3的value的副本分别到各自的工作内存。
2. 线程A通过`getIntVolatile(var1, var2)`拿到value值3，这时线程A被挂起。
3. 线程B也通过`getintVolatile(var1, var2)`方法获取到value值3，此时刚好线程B**没有被挂起**并执行`compareAndSwapInt`方法比较内存值也为3，成功修改内存值为4，线程B打完收工，一切OK。
4. 这时线程A恢复，执行`compareAndSwapInt`方法比较，发现自己手里的值数字3和主内存的值数字4不一致，说明该值己经被其它线程抢先一步修改过了，那A线程本次修改失败，**只能重新读取重新来一遍了。**
5. 线程A重新获取value值，因为变量value被volatile修饰，所以其它线程对它的修改，线程A总是能够看到，线程A继续执行`compareAndSwaplnt`进行比较替换，直到成功。
**底层汇编**

![ms6.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9daa9f7763bb471ea139a1f26bdba894~tplv-k3u1fbpfcp-watermark.image?)
> **CAS 简单小总结**
> 比较当前工作内存中的值和主内存中的值，如果相同则执行规定操作，否则继续比较直到主内存和工作内存中的值一致为止
* `synchronized`采用的是悲观锁，是一种独占锁，独占锁就意味着 其他线程只能依靠阻塞就是其他线程不停的询问来等待线程释放锁。而在 CPU 转换线程阻塞时会引起线程上下文切换，当有很多线程竞争锁的时候，会引起 CPU 频繁的上下文切换导致效率很低
* `CAS`采用的是一种乐观锁的机制，它不会阻塞任何线程，所以在效率上，它会比 synchronized 要高。所谓乐观锁就是：每次不加锁而是假设没有冲突而去完成某项操作，如果因为冲突失败就重试，直到成功为止。

### 3.5、CAS缺点
```java
// ursafe.getAndAddInt
public final int getAndAddInt(Object var1, long var2, int var4){
	int var5;
	do {
		var5 = this.getIntVolatile(var1, var2);
	}while(!this.compareAndSwapInt(varl, var2, var5，var5 + var4));
    return var5;
}
```
**1、循环时间长开销很大**\
有个do while，如果CAS失败，会一直进行尝试。如果CAS长时间一直不成功，可能会给CPU带来很大的开销。\
**2、只能保证一个共享变量的原子操作**\
当对一个共享变量执行操作时，我们可以使用循环CAS的方式来保证原子操作，但是对多个共享变量操作时，循环CAS就无法保证操作的原子性，这个时候就可以用锁来保证原子性。\
**3、引出来ABA问题**
> 相关面试题:原子类AtomicInteger的ABA问题谈谈?原子更新引用知道吗?
> CAS ---> UnSafe ---> CAS底层思想 ---> ABA ---> 原子引用更新 ---> 如果规避ABA问题
* CAS会导致“ABA问题”。
* CAS算法实现一个重要前提需要取出内存中某时刻的数据并在当下时刻比较并替换，那么在这个时间差类会导致数据的变化。
* 比如说一个线程one从内存位置V中取出A，这时候另一个线程two也从内存中取出A，并且线程two进行了一些操作将值变成了B,然后线程two又将V位置的数据变成A，这时候线程one进行CAS操作发现内存中仍然是A，然后线程one操作成功。
* **尽管线程one的CAS操作成功，但是不代表这个过程就是没有问题的。**
### 3.6、原子引用包装类AtomicReference包装自定义类型
```java
package com.hong.cas;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.ToString;

import java.util.concurrent.atomic.AtomicReference;

@Data
@AllArgsConstructor
class User{
    String userName;
    int age;
}

public class AtomicReferenceDemo {
    public static void main(String[] args) {
        User zs = new User("zs", 22);
        User ls = new User("ls", 25);

        // 原子引用包装类
        AtomicReference<User> atomicReference = new AtomicReference<>();
        atomicReference.set(zs);

        System.out.println(atomicReference.compareAndSet(zs, ls)+"\t"+atomicReference.get().toString());
        System.out.println(atomicReference.compareAndSet(zs, ls)+"\t"+atomicReference.get().toString());
    }
}
```
![ms9.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9195683ff14940dba87a2c15cc0ff096~tplv-k3u1fbpfcp-watermark.image?)
### 3.7、AtomicStampedReference版本号原子引用解决ABA问题
**原子引用 + 新增一种机制，那就是修改版本号（类似时间戳），它用来解决ABA问题。**
```java
package com.hong.cas;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicStampedReference;

/**
 * ABA问题解决
 */
public class ABADemo {

    static AtomicReference<Integer> atomicReference = new AtomicReference<>(100);
    static AtomicStampedReference<Integer> atomicStampedReference = new AtomicStampedReference<>(100,1);

    public static void main(String[] args) {

        System.out.println("------以下是ABA问题的产生------");

        new Thread(() -> {
            atomicReference.compareAndSet(100,101);
            atomicReference.compareAndSet(101,100);
        },"t1").start();

        new Thread(() -> {
            // 暂停一会线程,保证上面t1线程完成一次ABA操作
            try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }
            System.out.println(atomicReference.compareAndSet(100, 2019)+"\t"+atomicReference.get());
        },"t2").start();

        // 暂停一会线程
        try { TimeUnit.SECONDS.sleep(3); } catch (InterruptedException e) { e.printStackTrace(); }
        System.out.println("-----以下是ABA问题的解决------");

        new Thread(() -> {
            int stamp = atomicStampedReference.getStamp();
            System.out.println(Thread.currentThread().getName() + "\t 第1次版本号"+stamp);

            // 暂停 1秒 t3 线程
            try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }
            atomicStampedReference.compareAndSet(100,101,atomicStampedReference.getStamp(),atomicStampedReference.getStamp()+1);
            System.out.println(Thread.currentThread().getName() + "\t 第2次版本号"+atomicStampedReference.getStamp());
            atomicStampedReference.compareAndSet(101,100,atomicStampedReference.getStamp(),atomicStampedReference.getStamp()+1);
            System.out.println(Thread.currentThread().getName() + "\t 第3次版本号"+atomicStampedReference.getStamp());
        },"t3").start();

        new Thread(() -> {
            int stamp = atomicStampedReference.getStamp();
            System.out.println(Thread.currentThread().getName() + "\t 第1次版本号"+stamp);
            // 暂停 3秒 t4 线程，保证上面t3线程完成一次ABA操作
            try { TimeUnit.SECONDS.sleep(3); } catch (InterruptedException e) { e.printStackTrace(); }
            boolean result = atomicStampedReference.compareAndSet(100, 2022, stamp, stamp + 1);
            System.out.println(Thread.currentThread().getName() + "修改与否" + result + "\t 当前最新版本号"+atomicStampedReference.getStamp());

            System.out.println("当前实际最新值"+atomicStampedReference.getReference());
        },"t4").start();
    }
}
```
![juc10.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f67b5de1782541c98e28f80f4be3e369~tplv-k3u1fbpfcp-watermark.image?)
> **AtomicStampedReference常用方法解析**
```java
/**
   initialRef：初始值
   initialStamp：初始版本号
*/
public AtomicStampedReference(V initialRef, int initialStamp) {
    pair = Pair.of(initialRef, initialStamp);
}
 /**
   expectedReference：期望值
   newReference：新值
   expectedStamp：期望版本号
   newStamp：新的版本号
 */
 public boolean compareAndSet(V   expectedReference,
                                 V   newReference,
                                 int expectedStamp,
                                 int newStamp) {
        Pair<V> current = pair;
        return
            expectedReference == current.reference &&
            expectedStamp == current.stamp &&
            ((newReference == current.reference &&
              newStamp == current.stamp) ||
             casPair(current, Pair.of(newReference, newStamp)));
    }
```
## 4、线程不安全集合
> 面试题：我们知道ArrayList是线程不安全,请编写一个不安全的案例并给出解决方案

> 由于此张内容在JUC上文中探讨过，这里就不过多讨论
### 4.1、List
**ArrayList线程不安全，会报java.util.ConcurrentModificationException异常**\
堆栈信息
```java
java.util.ConcurrentModificationException
	at java.util.ArrayList$Itr.checkForComodification(ArrayList.java:909)
	at java.util.ArrayList$Itr.next(ArrayList.java:859)
	at java.util.AbstractCollection.toString(AbstractCollection.java:461)
	at java.lang.String.valueOf(String.java:2994)
	at java.io.PrintStream.println(PrintStream.java:821)
	at com.hong.collection.ArrayListNotSafeDemo.lambda$0(ArrayListNotSafeDemo.java:20)
	at java.lang.Thread.run(Thread.java:748)
```
#### 4.1.1、解决问题 ArrayList 线程不安全
* 使用 new Vector<>();（ArrayList所有方法加synchronized，太重）。
* 使用 Collections.synchronizedList(new ArrayList<>()); 转换成线程安全类。
* 使用 new java.concurrent.CopyOnWriteArrayList<>();（推荐）。
**CopyOnWriteArrayList 写时复制**
* 写时复制：CopyOnWrite容器，即写时复制的容器。
* 往一个容器添加元素的时候，不直接往当前容器 Object[] 添加，而是先将当前 Object[] 进行Copy，复制出一个新的容器Object[] newElements，然后新的容器Object[] newElements里添加元素，添加完元素之后，再将原容器的引用指向新的容器setArray(newElements)
* 这样做的好处是可以对CopyOnWrite容器进行并发的读，而不需要加锁，因为当前容器不会添加任何元素。
* 所以CopyOnWrite容器也是一种读写分离的思想，读和写不同的容器。
部分源码：
### 4.2、Set
HashSet也是非线性安全的。（HashSet底层是包装了一个HashMap的）
#### 4.2.1、解决办法
1.  `Collections.synchronizedSet(new HashSet<>())`
1.  `CopyOnWriteArraySet<>()（推荐）`
### 4.3、Map
#### 4.3.1、解决办法
1.  `HashTable`
1.  `Collections.synchronizedMap(new HashMap<>())`
1.  `ConcurrencyMap<>()（推荐）`
## 5、锁
> 面试题:5.公平锁/非公平锁/可重入锁/递归锁/自旋锁谈谈你的理解?请手写一个自旋锁
### 5.1、公平锁与非公平锁
* 公平锁：是指多个线程按照申请锁的顺序来获取锁，类似排队打饭，先来后到。
* 非公平锁：是指多个线程获取锁的顺序并不是按照申请锁的顺序，有可能后申请的线程比先申请的线程优先获取锁，在高并发的情况下，有可能会造成优先级反转或者饥饿现象
* 并发包中`ReentrantLock`的创建可以指定构造函数的`boolean`类型来得到公平锁或非公平锁，**默认是非公平锁**
* 对应`Synchronized`而言，也是一种非公平锁
#### 5.1.1、两者区别：
**公平锁**
* 公平锁：Threads acquire a fair lock in the order in which they requested it
* 公平锁，就是很公平，在并发环境中，每个线程在获取锁时会先查看此锁维护的等待队列，如果为空，或者当前线程是等待队列的第一个，就占有锁，否则就会加入到等待队列中，以后会**按照FIFO的规则从队列中取到自己**
**非公平锁**
* 非公平锁：a nonfair lock permits barging:threads requesting a lock can jump ahead of the queue of waiting threads if the lock happens to be available when it is requested.
* 非公平锁比较粗鲁，**上来就直接尝试占有锁**，如果尝试失败，就再采用类似公平锁那种方式。
### 5.2、可重入锁
* 可重入锁（也叫做递归锁）指的是同一线程外层函数获得锁之后，内层递归函数仍然能获取该锁的代码，**在同一个线程在外层方法获取锁的时候，在进入内层方法会自动获取锁**
* 就像有了家门的锁，厕所、书房、厨房就为你敞开了一样
* 也即是说，**线程可以进入任何一个它已经拥有的锁所同步着的代码块**
* ReentrantLock，synchronized 就是一个典型的可重入锁
* 可重入锁的**最大作用就是避免死锁**
```java
package com.hong.juc;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

class Phone2 implements Runnable{
    //Reentrant TEST
    Lock lock = new ReentrantLock();

    @Override
    public void run() {
        get();
    }

    public void get() {
        lock.lock();
        try {
            System.out.println(Thread.currentThread().getName() + "\t" + "get()");
            set();
        } finally {
            lock.unlock();
        }
    }

    public void set() {
        lock.lock();
        try {
            System.out.println(Thread.currentThread().getName() + "\t" + "set()");
        } finally {
            lock.unlock();
        }
    }
}

class Phone1{
    public synchronized void sendSMS() throws Exception {
        System.out.println(Thread.currentThread().getName() + "\t invoked sendSMS()");
        sendEmail();
    }

    public synchronized void sendEmail() throws Exception {
        System.out.println(Thread.currentThread().getName() + "\t invoked sendEmail()");
    }
}

/*
 * 可重入锁（也就是递归锁）
 *
 * 指的是同一个线程外层函数获得锁之后，内层递归函数仍然能获取该锁的代码，
 * 在同一线程在外层方法获取锁的时候，在进入内层方法会自动获取锁。
 *
 * 也就是说，线程可以进入任何一个它已经拥有的锁所有同步着的代码块。
 *
 * t1   invoked sendSMS()      t1线程在外层方法获取锁的时候
 * t1   invoked sendEmail()    t1在进入内层方法会自动获取锁
 * t2   invoked sendSMS()
 * t2   invoked sendEmail()
 *
 */
public class RenenterLockDemo {
    public static void main(String[] args) {
        Phone1 phone = new Phone1();
        new Thread(() -> {
            try {
                phone.sendSMS();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, "t1").start();

        new Thread(() -> {
            try {
                phone.sendSMS();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, "t2").start();

        // 暂停一会线程
        try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }

        Phone2 phone2 = new Phone2();
        new Thread(() -> {
            try {
                phone2.get();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, "t1").start();

        new Thread(() -> {
            try {
                phone2.set();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, "t2").start();
    }
}
```
![ms11.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/78a1f3e0f39944a8b5c1f2808d09dc44~tplv-k3u1fbpfcp-watermark.image?)
**锁两次，释放两次的情况**
```java
public void get() {
    lock.lock();
    lock.lock();
    try {
        System.out.println(Thread.currentThread().getName() + "\t" + "get()");
        set();
    } finally {
        lock.unlock();
        lock.unlock();
    }
}
```
### 5.3、自旋锁
**自旋锁（SpinLock）**
是指尝试获取锁的线程不会立即阻塞，而是**采用循环的方式去尝试获取锁**，这样的好处是**减少线程上下文切换的消耗，缺点是循环会消耗CPU**
```java
public final int getAndAddInt(Object var1, long var2, int var4) {
    int var5;
    do {
        var5 = this.getIntVolatile(var1, var2);
    } while(!this.compareAndSwapInt(var1, var2, var5, var5 + var4));

    return var5;
}
```
**使用 AtomicReference 封装 Thread ，通过 CAS算法实现线程的自旋锁**
```java
package com.hong.spinlock;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 写一个自旋锁
 * 自旋锁的好处：循环比较获取直到成功为止，没有类似wait的阻塞。
 *
 * 通过CAS操作完成自旋锁：
 *  A线程先进来调用myLock方法自已持有锁5秒钟
 *  B随后进来后发现当前有线程持有锁，不是null，
 *  所以只能通过自旋等待，直至A释放锁后B随后抢到
 */
public class SpinLockDemo {

    // 原子引用线程
    AtomicReference<Thread> atomicReference = new AtomicReference<>();

    public void myLock(){
        Thread thread = Thread.currentThread();
        System.out.println(Thread.currentThread().getName() + "\t come in (●'◡'●)");

        while (!atomicReference.compareAndSet(null,thread)){

        }
    }

    public void myUnlock(){
        Thread thread = Thread.currentThread();
        atomicReference.compareAndSet(thread,null);
        System.out.println(Thread.currentThread().getName()+"\t invoke myUnLock");
    }

    public static void main(String[] args) {
        SpinLockDemo spinLockDemo = new SpinLockDemo();

        new Thread(() -> {
            spinLockDemo.myLock();
            // 暂停一会线程
            try { TimeUnit.SECONDS.sleep(5); } catch (InterruptedException e) { e.printStackTrace(); }
            spinLockDemo.myUnlock();
        },"AA").start();

        try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }

        new Thread(() -> {
            spinLockDemo.myLock();
            // 暂停一会线程
            try { TimeUnit.SECONDS.sleep(1); } catch (InterruptedException e) { e.printStackTrace(); }
            spinLockDemo.myUnlock();
        },"BB").start();

    }
}
```
程序运行结果：核心为 CAS 算法
* 线程 A 先执行，此时期望值为 null ，线程 A 将获得锁，并将期望值设置为线程 A 自身
* 线程 B 尝试获取锁，发现期望值并不是 null ，就在那儿原地自旋
* 线程 A 释放锁之后，将期望值设置为 null ，此时线程 B 获得锁，将期望值设置为线程 B 自身
* 最后线程 B 释放锁

![ms12.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/aed0b52ae28c4ae9be24c79a4b4ad38b~tplv-k3u1fbpfcp-watermark.image?)
### 5.4、独占锁(写)/共享锁(读)/互斥锁
**代码实现**
```java
package com.hong.juc;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

class MyCache {
    private volatile Map<String, Object> map = new HashMap<>();
    private ReadWriteLock readWriteLock = new ReentrantReadWriteLock();

    public void put(String key, Object value) {
        readWriteLock.writeLock().lock();
        System.out.println(Thread.currentThread().getName() + "\t 写入数据" + key);
        try {
            // 暂停一会线程毫秒
            TimeUnit.MICROSECONDS.sleep(300);
            map.put(key, value);
            System.out.println(Thread.currentThread().getName() + "\t 写入完成");
        } catch (InterruptedException e) {
            e.printStackTrace();
        }finally {
            readWriteLock.writeLock().unlock();
        }
    }

    public void get(String key) {
        readWriteLock.readLock().lock();
        try {
            System.out.println(Thread.currentThread().getName() + "\t 读取数据");
            TimeUnit.MICROSECONDS.sleep(300);
            Object result = map.get(key);
            System.out.println(Thread.currentThread().getName() + "\t 读取完成"+ result);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }finally {
            readWriteLock.readLock().unlock();
        }
    }
}
/**
 * 多个线程同时读一个资源类没有任何问题，所以为了满足并发量，读取共享资源应该可以同时进行。
 * 但是，如果有一个线程想去写共享资源来，就不应该再有其他线程可以对改资源进行读或写
 * 小总结：
 *      读-读能共存
 *      读-写不能共存
 *      写-写不能共存
 *
 *      写操作： 原子 + 独占
 */
public class ReadWriteLockDemo {
    public static void main(String[] args) {
        MyCache myCache = new MyCache();

        for (int i = 1; i <= 5; i++) {
            final int tempInt = i;
            new Thread(() -> {
                myCache.put(tempInt+"",tempInt+"");
            },String.valueOf(i)).start();
        }

        for (int i = 1; i <= 5; i++) {
            final int tempInt = i;
            new Thread(() -> {
                myCache.get(tempInt+"");
            },String.valueOf(i)).start();
        }
    }
}
```
## 6、死锁编码及定位分析
### 6.1、死锁是什么
死锁是指两个或两个以上的进程在执行过程中，因争夺资源而造成的一种互相等待的现象,若无外力干涉那它们都将无法推进下去，如果系统资源充足，进程的资源请求都能够碍到满足，死锁出现的可能性就很低，否则就会因争夺有限的资源而陷入死锁。

![juc37.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b2b304435b9f48b6abe30657c03a4247~tplv-k3u1fbpfcp-watermark.image?)
### 6.2、产生死锁的主要原因
**系统资源不足**
**进程运行推进的顺序不合适**
**资源分配不当**
### 6.3、代码演示
```java
package com.hong.deadlock;

import java.util.concurrent.TimeUnit;

class MyTask implements Runnable{

    private Object resourceA, resourceB;

    public MyTask(Object resourceA, Object resourceB) {
        this.resourceA = resourceA;
        this.resourceB = resourceB;
    }

    @Override
    public void run() {
        synchronized (resourceA) {
            System.out.println(String.format("%s 自己持有%s，尝试持有%s",//
                    Thread.currentThread().getName(), resourceA, resourceB));

            try {
                TimeUnit.SECONDS.sleep(2);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            synchronized (resourceB) {
                System.out.println(String.format("%s 同时持有%s，%s",//
                        Thread.currentThread().getName(), resourceA, resourceB));
            }
        }
    }
}

public class DeadLockDemo {
    public static void main(String[] args) {
        Object resourceA = new Object();
        Object resourceB = new Object();

        new Thread(new MyTask(resourceA, resourceB),"Thread A").start();
        new Thread(new MyTask(resourceB, resourceA),"Thread B").start();
    }
}
```
![juc38.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/60873154e92949e59ce0ddfa90fe7a38~tplv-k3u1fbpfcp-watermark.image?)
程序卡死，未出现`同时持有`的字样。
### 6.4、如何解决死锁问题
破坏发生死锁的四个条件其中之一即可。
**查看是否死锁工具**：
1.  jps命令定位进程号

![juc39.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dd0e0235f3fa4d4b9541adb0ec92ab51~tplv-k3u1fbpfcp-watermark.image?)
1.  jstack找到死锁查看

![juc40.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/27eefc57587940ec802f0bc5b291ee7a~tplv-k3u1fbpfcp-watermark.image?)