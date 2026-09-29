import 'package:flutter/material.dart';

void main() {
  runApp(const SigpaeApp());
}

class SigpaeApp extends StatelessWidget {
  const SigpaeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIGPAE',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal)),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SIGPAE')),
      body: const Center(
        child: Text('Sistema Integral de Gestión del PAE'),
      ),
    );
  }
}
