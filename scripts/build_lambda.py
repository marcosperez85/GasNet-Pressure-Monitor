"""Prepare the existing Terraform ZIP directory with Linux Python 3.11 wheels.

Works on Windows and Linux. Never packages the developer's virtual environment.
"""
import argparse
import hashlib
from importlib.metadata import distributions
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from packaging.markers import default_environment
from packaging.requirements import Requirement
from packaging.utils import canonicalize_name


ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_dependencies(directory):
    packages = {canonicalize_name(d.metadata['Name']): d for d in distributions(path=[str(directory)])}
    environment = default_environment()
    environment.update(python_version='3.11', python_full_version='3.11.14', sys_platform='linux',
                       os_name='posix', platform_system='Linux', platform_machine='x86_64', extra='')
    for name, dist in packages.items():
        for raw in dist.requires or []:
            requirement = Requirement(raw)
            if requirement.marker and not requirement.marker.evaluate(environment):
                continue
            dependency = packages.get(canonicalize_name(requirement.name))
            if dependency is None or dependency.version not in requirement.specifier:
                raise RuntimeError(f'{name} requires {raw}; update requirements-lambda.lock')
    for line in (ROOT / 'requirements.txt').read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith(('#', '-')):
            continue
        requirement = Requirement(line)
        dependency = packages.get(canonicalize_name(requirement.name))
        if dependency is None or dependency.version not in requirement.specifier:
            raise RuntimeError(f'Package does not match requirements.txt: {line}')


def build(source):
    build_root = ROOT / 'build'
    build_root.mkdir(exist_ok=True)
    destination = (build_root / 'lambda').resolve()
    # All cleanup targets are resolved and checked within this project's build dir.
    if destination.parent != build_root.resolve():
        raise RuntimeError('Invalid build destination')
    with tempfile.TemporaryDirectory(prefix='lambda-', dir=build_root) as temporary:
        staging = Path(temporary)
        subprocess.run([
            sys.executable, '-m', 'pip', 'install', '--requirement', str(ROOT / 'requirements-lambda.lock'),
            '--target', str(staging), '--platform', 'manylinux2014_x86_64',
            '--python-version', '3.11', '--implementation', 'cp', '--only-binary=:all:',
            '--no-deps', '--no-compile', '--disable-pip-version-check',
        ], check=True)
        validate_dependencies(staging)
        files = sorted(source.glob('*.py'))
        if not any(p.name == 'lambda_function.py' for p in files):
            raise RuntimeError('Source must contain lambda_function.py')
        hashes = [digest(ROOT / 'requirements.txt'), digest(ROOT / 'requirements-lambda.lock')]
        for file in files:
            shutil.copy2(file, staging / file.name)
            hashes.append(file.name + ':' + digest(file))
        (staging / '.source-hash').write_text(hashlib.sha256('\n'.join(hashes).encode()).hexdigest(), encoding='utf-8')
        size = sum(p.stat().st_size for p in staging.rglob('*') if p.is_file())
        if size >= 250 * 1024 * 1024:
            raise RuntimeError('Package exceeds Lambda uncompressed ZIP limit')
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(staging, destination)
    print(f'Lambda preparada en {destination} ({size / 1024 / 1024:.1f} MiB sin comprimir).')
    print('Terraform archive_file crea POC-chatbot-lambda.zip durante plan.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'lambda/chatbot')
    build(parser.parse_args().source.resolve())
