def fibo(n):
    a, b = 0, 1
    l = [a, b]
    while len(l) < n:
        print(a, end=' ')
        a, b = b, a + b
        l.append(a)
    print()
    return l


