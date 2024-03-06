def fibo(n):
    a, b = 0, 1
    l = [a, b]
    while a < n:
        print(a, end=' ')
        a, b = b, a + b
        l.append(a)
    print()
    return l


