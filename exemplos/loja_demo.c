/*
 * Exemplo educativo para engenharia reversa com REA + Hopper.
 * Codigo original e autorizado: nao depende de programas de terceiros.
 */
#include <stdio.h>

#if defined(__GNUC__)
#define NAO_INLINE __attribute__((noinline))
#else
#define NAO_INLINE
#endif

NAO_INLINE int aplicar_desconto(int valor_centavos, int percentual) {
    if (percentual < 0) percentual = 0;
    if (percentual > 100) percentual = 100;
    return valor_centavos * (100 - percentual) / 100;
}

NAO_INLINE int calcular_total(int preco_unitario_centavos, int quantidade, int desconto_percentual) {
    if (preco_unitario_centavos < 0 || quantidade < 0) return -1;
    return aplicar_desconto(preco_unitario_centavos * quantidade, desconto_percentual);
}

NAO_INLINE int calcular_lucro(int venda_centavos, int custo_centavos) {
    return venda_centavos - custo_centavos;
}

int main(void) {
    int total = calcular_total(1500, 3, 10);
    int lucro = calcular_lucro(total, 2100);
    printf("total_centavos=%d lucro_centavos=%d\n", total, lucro);
    return total == 4050 && lucro == 1950 ? 0 : 1;
}
