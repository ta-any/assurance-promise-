class Assurance<T> {
    private static _PENDING = 'pending';
    private static _FULFILLED = 'fulfilled';
    private static _REJECTED = 'rejected';

    private state: string;
    private value: T | undefined;
    private reason: any;
    private onFulfilledCallbacks: Array<() => void> = [];
    private onRejectedCallbacks: Array<() => void> = [];

    constructor(
        executor: (
            resolve: (value: T | PromiseLike<T>) => void,
            reject: (reason?: any) => void
        ) => void
    ) {
        this.state = Assurance._PENDING;

        try {
            executor(
                value => this._resolve(value),
                reason => this._reject(reason)
            );
        } catch (error) {
            this._reject(error);
        }
    }

    private _resolve(value: T | PromiseLike<T>): void {
        if (this.state !== Assurance._PENDING) return;

        if (value && typeof (value as PromiseLike<T>).then === 'function') {
            (value as PromiseLike<T>).then(
                val => this._resolve(val),
                err => this._reject(err)
            );
            return;
        }

        this.state = Assurance._FULFILLED;
        this.value = value as T;
        this.onFulfilledCallbacks.forEach(cb => cb());
        this.onFulfilledCallbacks = [];
    }

    private _reject(reason?: any): void {
        if (this.state !== Assurance._PENDING) return;

        this.state = Assurance._REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach(cb => cb());
        this.onRejectedCallbacks = [];
    }

    then<TResult1 = T, TResult2 = never>(
        onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
        onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Assurance<TResult1 | TResult2> {
        return new Assurance((resolve, reject) => {
            const wrappedFulfilled = (value: T) => {
                try {
                    resolve(onFulfilled ? onFulfilled(value) : value as any);
                } catch (error) {
                    reject(error);
                }
            };

            const wrappedRejected = (reason: any) => {
                try {
                    if (onRejected) {
                        resolve(onRejected(reason));
                    } else {
                        reject(reason);
                    }
                } catch (error) {
                    reject(error);
                }
            };

            if (this.state === Assurance._FULFILLED) {
                setTimeout(() => wrappedFulfilled(this.value!), 0);
            } else if (this.state === Assurance._REJECTED) {
                setTimeout(() => wrappedRejected(this.reason), 0);
            } else {
                this.onFulfilledCallbacks.push(() => wrappedFulfilled(this.value!));
                this.onRejectedCallbacks.push(() => wrappedRejected(this.reason));
            }
        });
    }

    catch<TResult = never>(
        onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
    ): Assurance<T | TResult> {
        return this.then(null, onRejected);
    }

    static resolve<T>(value: T | PromiseLike<T>): Assurance<T> {
        return new Assurance(resolve => resolve(value));
    }

    static reject<T = never>(reason?: any): Assurance<T> {
        return new Assurance((_, reject) => reject(reason));
    }
}

// use case
console.log('Start...');
const promise = new Assurance<string>((resolve, reject) => {
    resolve('Успех!');
    reject(new Error('Ошибка!'));
});

promise
    .then(value => {
        console.log('Результат:', value);
        return value + ' дополнение';
    })
    .then(newValue => {
        console.log('Цепочка:', newValue);
    })
    .catch(error => {
        console.error('Ошибка:', error);
    });

const promise2 = new Assurance((resolve) => {
    setTimeout(() => {
        resolve(123); // Разрешаем промис значением 123
        console.log("promise end")
    }, 100);
});

promise2.then((result) => {
    console.log("start result: ")
    console.log(result)
})
console.log("End...")

const resultResolve = Assurance.resolve({"text": "TEST", "Number": 123})

resultResolve.then((res) => {
    console.log(res.text)
})
