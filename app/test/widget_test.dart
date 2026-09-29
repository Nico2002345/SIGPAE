import 'package:flutter_test/flutter_test.dart';
import 'package:sigpae_app/main.dart';

void main() {
  testWidgets('Muestra el título SIGPAE', (WidgetTester tester) async {
    await tester.pumpWidget(const SigpaeApp());

    expect(find.text('SIGPAE'), findsOneWidget);
    expect(find.text('Sistema Integral de Gestión del PAE'), findsOneWidget);
  });
}
